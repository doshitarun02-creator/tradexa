from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import ValidationError

from models.redemption import create_redemption, serialize_redemption, is_valid_transition
from schemas.redemption import CreateRedemptionSchema, ReviewRedemptionSchema, CompleteRedemptionSchema
from services.points_service import debit_points, credit_points, InsufficientPointsError, UserNotFoundError, DuplicateLedgerEntryError
from models.audit import log_admin_action
from utils.response import api_response
from utils.permissions import require_permission
from utils.pagination import parse_pagination, PaginationError
from utils.logger import logger

redemptions_bp = Blueprint("redemptions", __name__)


def _client_meta():
    return {"ip": request.remote_addr, "user_agent": request.headers.get("User-Agent")}


@redemptions_bp.route("/redemptions", methods=["POST"])
@jwt_required()
def create_redemption_request():
    db = current_app.db
    user_id = get_jwt_identity()

    try:
        payload = CreateRedemptionSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return api_response(False, {}, "User not found", 404)
    if user.get("status", "active") != "active":
        return api_response(False, {}, "Your account is suspended. Contact an administrator.", 403)
    if user.get("points_balance", 0) < payload.points_requested:
        return api_response(False, {}, "Insufficient points balance for this redeem request", 400)

    pending_exists = db.redeem_requests.find_one({"user_id": ObjectId(user_id), "status": "pending"})
    if pending_exists:
        return api_response(False, {}, "You already have a pending redeem request. Wait for it to be reviewed.", 400)

    doc = create_redemption(
        user_id=user_id,
        points_requested=payload.points_requested,
        payout_method=payload.payout_method,
        payout_details=payload.payout_details,
        note_by_user=payload.note_by_user,
    )
    result = db.redeem_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    return api_response(True, {"redemption": serialize_redemption(doc)}, "Redeem request submitted", 201)


@redemptions_bp.route("/redemptions/my-requests", methods=["GET"])
@jwt_required()
def my_redemption_requests():
    db = current_app.db
    user_id = get_jwt_identity()
    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    query = {"user_id": ObjectId(user_id)}
    total = db.redeem_requests.count_documents(query)
    docs = list(db.redeem_requests.find(query).sort("created_at", -1).skip(skip).limit(limit))

    return api_response(True, {
        "redemptions": [serialize_redemption(d) for d in docs],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit,
    }, "Redeem requests fetched")


@redemptions_bp.route("/redemptions/<redemption_id>", methods=["GET"])
@jwt_required()
def get_my_redemption(redemption_id):
    db = current_app.db
    user_id = get_jwt_identity()
    try:
        rid = ObjectId(redemption_id)
    except Exception:
        return api_response(False, {}, "Invalid redemption ID", 400)

    doc = db.redeem_requests.find_one({"_id": rid, "user_id": ObjectId(user_id)})
    if not doc:
        return api_response(False, {}, "Redeem request not found", 404)

    return api_response(True, {"redemption": serialize_redemption(doc)}, "Redeem request fetched")


# ---------------------------------------------------------------------------
# Admin (super_admin only) endpoints
# ---------------------------------------------------------------------------

@redemptions_bp.route("/admin/redemptions", methods=["GET"])
@require_permission("redemptions:view")
def list_redemption_requests():
    db = current_app.db
    status_filter = request.args.get("status")
    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    query = {}
    if status_filter in ["pending", "approved", "rejected", "completed", "failed"]:
        query["status"] = status_filter

    total = db.redeem_requests.count_documents(query)
    docs = list(db.redeem_requests.find(query).sort("created_at", -1).skip(skip).limit(limit))

    user_ids = list({d["user_id"] for d in docs})
    users = {str(u["_id"]): u for u in db.users.find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1})}

    enriched = []
    for d in docs:
        sd = serialize_redemption(d)
        u = users.get(sd["user_id"])
        sd["user_name"] = u.get("name", "") if u else ""
        sd["user_email"] = u.get("email", "") if u else ""
        enriched.append(sd)

    return api_response(True, {
        "redemptions": enriched, "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit,
    }, "Redeem requests fetched")


@redemptions_bp.route("/admin/redemptions/<redemption_id>/approve", methods=["POST"])
@require_permission("redemptions:approve")
def approve_redemption(redemption_id):
    db = current_app.db
    actor_id = get_jwt_identity()
    claims = get_jwt()

    try:
        payload = ReviewRedemptionSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    try:
        rid = ObjectId(redemption_id)
    except Exception:
        return api_response(False, {}, "Invalid redemption ID", 400)

    redemption = db.redeem_requests.find_one({"_id": rid})
    if not redemption:
        return api_response(False, {}, "Redeem request not found", 404)

    if not is_valid_transition(redemption["status"], "approved"):
        return api_response(
            False, {}, f"Cannot approve a request in '{redemption['status']}' status", 409
        )

    locked = db.redeem_requests.find_one_and_update(
        {"_id": rid, "status": "pending"},
        {"$set": {"status": "approved", "approved_by": ObjectId(actor_id),
                   "approved_at": datetime.now(timezone.utc), "note_by_admin": payload.note_by_admin}},
        return_document=True,
    )
    if locked is None:
        return api_response(False, {}, "Request is no longer pending (already reviewed elsewhere)", 409)

    try:
        debit_points(
            db, user_id=redemption["user_id"], amount=redemption["points_requested"],
            actor_id=actor_id,
            reason=f"Redeem request {redemption_id} approved" + (f": {payload.note_by_admin}" if payload.note_by_admin else ""),
            entry_type="redeem_approved",
            reference_type="redemption", reference_id=redemption_id,
        )
    except InsufficientPointsError:
        db.redeem_requests.update_one(
            {"_id": rid},
            {"$set": {"status": "failed", "note_by_admin": "Auto-failed: user balance insufficient at approval time"}}
        )
        return api_response(False, {}, "User no longer has sufficient points balance. Request marked failed.", 400)
    except UserNotFoundError:
        db.redeem_requests.update_one({"_id": rid}, {"$set": {"status": "failed"}})
        return api_response(False, {}, "User not found. Request marked failed.", 404)
    except DuplicateLedgerEntryError:
        logger.exception("Duplicate redeem_approved ledger entry detected")

    log_admin_action(
        db, actor_id=actor_id, actor_role=claims.get("role"), action="redemption_approve",
        target_type="redemption", target_id=redemption_id,
        before={"status": "pending"}, after={"status": "approved"},
        metadata={"points_requested": redemption["points_requested"]}, **_client_meta(),
    )

    updated = db.redeem_requests.find_one({"_id": rid})
    return api_response(True, {"redemption": serialize_redemption(updated)}, "Redeem request approved and points deducted")


@redemptions_bp.route("/admin/redemptions/<redemption_id>/reject", methods=["POST"])
@require_permission("redemptions:reject")
def reject_redemption(redemption_id):
    db = current_app.db
    actor_id = get_jwt_identity()
    claims = get_jwt()

    try:
        payload = ReviewRedemptionSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    try:
        rid = ObjectId(redemption_id)
    except Exception:
        return api_response(False, {}, "Invalid redemption ID", 400)

    redemption = db.redeem_requests.find_one({"_id": rid})
    if not redemption:
        return api_response(False, {}, "Redeem request not found", 404)

    if not is_valid_transition(redemption["status"], "rejected"):
        return api_response(
            False, {}, f"Cannot reject a request in '{redemption['status']}' status", 409
        )

    updated = db.redeem_requests.find_one_and_update(
        {"_id": rid, "status": "pending"},
        {"$set": {"status": "rejected", "rejected_by": ObjectId(actor_id),
                   "rejected_at": datetime.now(timezone.utc), "note_by_admin": payload.note_by_admin}},
        return_document=True,
    )
    if updated is None:
        return api_response(False, {}, "Request is no longer pending (already reviewed elsewhere)", 409)

    log_admin_action(
        db, actor_id=actor_id, actor_role=claims.get("role"), action="redemption_reject",
        target_type="redemption", target_id=redemption_id,
        before={"status": "pending"}, after={"status": "rejected"},
        metadata={"note": payload.note_by_admin}, **_client_meta(),
    )

    return api_response(True, {"redemption": serialize_redemption(updated)}, "Redeem request rejected")


@redemptions_bp.route("/admin/redemptions/<redemption_id>/complete", methods=["POST"])
@require_permission("redemptions:approve")
def complete_redemption(redemption_id):
    """
    Marks an approved redemption as completed (cash actually paid out offline)
    or failed (payout attempt failed, e.g. bad bank details) — the terminal
    step confirming the offline cash transfer actually happened.
    """
    db = current_app.db
    actor_id = get_jwt_identity()
    claims = get_jwt()

    try:
        payload = CompleteRedemptionSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    try:
        rid = ObjectId(redemption_id)
    except Exception:
        return api_response(False, {}, "Invalid redemption ID", 400)

    redemption = db.redeem_requests.find_one({"_id": rid})
    if not redemption:
        return api_response(False, {}, "Redeem request not found", 404)

    target_status = "completed" if payload.success else "failed"
    if not is_valid_transition(redemption["status"], target_status):
        return api_response(
            False, {}, f"Cannot mark a request in '{redemption['status']}' status as '{target_status}'", 409
        )

    update_fields = {"status": target_status, "note_by_admin": payload.note_by_admin}
    if target_status == "completed":
        update_fields["completed_at"] = datetime.now(timezone.utc)

    updated = db.redeem_requests.find_one_and_update(
        {"_id": rid, "status": "approved"},
        {"$set": update_fields},
        return_document=True,
    )
    if updated is None:
        return api_response(False, {}, "Request is not in 'approved' status", 409)

    if target_status == "failed":
        try:
            credit_points(
                db, user_id=redemption["user_id"], amount=redemption["points_requested"],
                actor_id=actor_id,
                reason=f"Redeem request {redemption_id} marked failed — points refunded",
                entry_type="refund",
                reference_type="redemption", reference_id=f"{redemption_id}-refund",
            )
        except DuplicateLedgerEntryError:
            logger.exception("Duplicate refund ledger entry detected for failed redemption")

    log_admin_action(
        db, actor_id=actor_id, actor_role=claims.get("role"), action=f"redemption_{target_status}",
        target_type="redemption", target_id=redemption_id,
        before={"status": "approved"}, after={"status": target_status},
        metadata={"note": payload.note_by_admin}, **_client_meta(),
    )

    return api_response(True, {"redemption": serialize_redemption(updated)}, f"Redeem request marked {target_status}")
