from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError

from models.market import create_market, serialize_market
from utils.limiter import limiter
from utils.response import api_response
from utils.pagination import parse_pagination, PaginationError
from schemas.market import CreateMarketSchema, UpdateMarketSchema
from models.audit import log_admin_action
from utils.permissions import require_permission
from utils.logger import logger

markets_bp = Blueprint("markets", __name__)


def _require_admin(claims):
    if claims.get("role") != "super_admin":
        return api_response(False, {}, "Super admin access required", 403)
    return None


def _client_meta():
    return {
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent"),
    }


@markets_bp.route("/markets", methods=["GET"])
def get_markets():
    db = current_app.db
    category = request.args.get("category")
    status = request.args.get("status")

    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    markets = list(db.markets.find(query).sort("created_at", -1).skip(skip).limit(limit))
    total = db.markets.count_documents(query)
    pages = (total + limit - 1) // limit

    return api_response(True, {
        "markets": [serialize_market(m) for m in markets],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }, "Markets fetched")


@markets_bp.route("/markets/<market_id>", methods=["GET"])
def get_market(market_id):
    db = current_app.db
    try:
        oid = ObjectId(market_id)
    except Exception:
        return api_response(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return api_response(False, {}, "Market not found", 404)
    return api_response(True, {"market": serialize_market(market)}, "Market fetched")


@markets_bp.route("/admin/markets", methods=["POST"])
@require_permission("markets:create")
def create_market_route():
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    try:
        payload = CreateMarketSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    try:
        market_doc = create_market(
            question=payload.question,
            category=payload.category,
            icon=payload.icon,
            price_symbol=payload.price_symbol,
            end_time=payload.end_time,
            b=payload.b,
        )
        body = request.get_json(silent=True) or {}
        market_doc["status"] = body.get("status", "upcoming")

        result = db.markets.insert_one(market_doc)
        market_doc["_id"] = result.inserted_id

        # Write administrative audit entry
        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="market_create",
            target_type="market",
            target_id=str(result.inserted_id),
            before=None,
            after=serialize_market(market_doc),
            metadata={"source": "admin_panel"},
            **_client_meta()
        )

        return api_response(True, {"market": serialize_market(market_doc)}, "Market created", 201)
    except Exception as e:
        logger.exception("Market creation failed")
        return api_response(False, {}, "Failed to create market", 500)


@markets_bp.route("/admin/markets/<market_id>", methods=["PATCH"])
@require_permission("markets:update")
def update_market(market_id):
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    try:
        oid = ObjectId(market_id)
    except Exception:
        return api_response(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return api_response(False, {}, "Market not found", 404)

    if market.get("status") == "settled":
        return api_response(False, {}, "Settled markets cannot be edited", 400)

    try:
        payload = UpdateMarketSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    update_fields = payload.model_dump(exclude_none=True)

    if "b" in update_fields and update_fields["b"] != market.get("b", 100.0):
        if float(market.get("yes_shares", 0.0)) + float(market.get("no_shares", 0.0)) > 0:
            return api_response(False, {}, "Cannot change liquidity parameter on a market with existing trades.", 400)

    if not update_fields:
        return api_response(False, {}, "No valid fields to update", 400)

    before_snapshot = serialize_market(market)

    try:
        db.markets.update_one({"_id": oid}, {"$set": update_fields})
        updated = db.markets.find_one({"_id": oid})

        # Write administrative audit entry
        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="market_update",
            target_type="market",
            target_id=market_id,
            before=before_snapshot,
            after=serialize_market(updated),
            metadata={"changed_fields": list(update_fields.keys())},
            **_client_meta()
        )

        return api_response(True, {"market": serialize_market(updated)}, "Market updated")
    except Exception as e:
        logger.exception("Market update failed")
        return api_response(False, {}, "Failed to update market", 500)


@markets_bp.route("/admin/markets/<market_id>", methods=["DELETE"])
@require_permission("markets:delete")
def delete_market(market_id):
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    try:
        oid = ObjectId(market_id)
    except Exception:
        return api_response(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return api_response(False, {}, "Market not found", 404)

    if market.get("status") == "live":
        return api_response(False, {}, "Cannot delete a live market", 400)

    before_snapshot = serialize_market(market)

    try:
        db.markets.delete_one({"_id": oid})

        # Write administrative audit entry
        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="market_delete",
            target_type="market",
            target_id=market_id,
            before=before_snapshot,
            after=None,
            metadata={},
            **_client_meta()
        )

        return api_response(True, {}, "Market deleted")
    except Exception as e:
        logger.exception("Market deletion failed")
        return api_response(False, {}, "Failed to delete market", 500)
