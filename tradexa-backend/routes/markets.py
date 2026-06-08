from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
from datetime import datetime, timezone

from models.market import create_market, serialize_market

markets_bp = Blueprint("markets", __name__)


def _resp(success, data, message, status=200):
    return {"success": success, "data": data, "message": message}, status


def _require_admin(claims):
    if claims.get("role") != "admin":
        return _resp(False, {}, "Admin access required", 403)
    return None


@markets_bp.route("/markets", methods=["GET"])
def get_markets():
    db = current_app.db
    category = request.args.get("category")
    status = request.args.get("status")
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(int(request.args.get("limit", 20)), 50)
    skip = (page - 1) * limit

    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    markets = list(db.markets.find(query).sort("created_at", -1).skip(skip).limit(limit))
    total = db.markets.count_documents(query)

    return _resp(True, {
        "markets": [serialize_market(m) for m in markets],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }, "Markets fetched")


@markets_bp.route("/markets/<market_id>", methods=["GET"])
def get_market(market_id):
    db = current_app.db
    try:
        oid = ObjectId(market_id)
    except Exception:
        return _resp(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return _resp(False, {}, "Market not found", 404)

    return _resp(True, {"market": serialize_market(market)}, "Market fetched")


@markets_bp.route("/admin/markets", methods=["POST"])
@jwt_required()
def create_market_route():
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    body = request.get_json(silent=True) or {}

    question = (body.get("question") or "").strip()
    category = (body.get("category") or "").strip()
    icon = (body.get("icon") or "📊").strip()
    price_symbol = (body.get("price_symbol") or "").strip()
    end_time_str = body.get("end_time")
    b = float(body.get("b", 100.0))

    if not question or not category or not end_time_str:
        return _resp(False, {}, "question, category, and end_time are required", 400)

    if category not in ["Crypto", "Forex", "Macro", "Stocks", "Commodities"]:
        return _resp(False, {}, "category must be one of: Crypto, Forex, Macro, Stocks, Commodities", 400)

    try:
        end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
    except ValueError:
        return _resp(False, {}, "end_time must be valid ISO 8601 datetime", 400)

    if end_time <= datetime.now(timezone.utc):
        return _resp(False, {}, "end_time must be in the future", 400)

    market_doc = create_market(question, category, icon, price_symbol, end_time, b)
    market_doc["status"] = body.get("status", "upcoming")

    result = db.markets.insert_one(market_doc)
    market_doc["_id"] = result.inserted_id

    return _resp(True, {"market": serialize_market(market_doc)}, "Market created", 201)


@markets_bp.route("/admin/markets/<market_id>", methods=["PATCH"])
@jwt_required()
def update_market(market_id):
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    try:
        oid = ObjectId(market_id)
    except Exception:
        return _resp(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return _resp(False, {}, "Market not found", 404)

    if market.get("status") == "settled":
        return _resp(False, {}, "Settled markets cannot be edited", 400)

    body = request.get_json(silent=True) or {}
    allowed = ["question", "category", "icon", "price_symbol", "status", "end_time", "b"]
    update_fields = {}

    for field in allowed:
        if field in body:
            if field == "end_time":
                try:
                    update_fields[field] = datetime.fromisoformat(body[field].replace("Z", "+00:00"))
                except ValueError:
                    return _resp(False, {}, "end_time must be valid ISO 8601", 400)
            elif field == "status":
                if body[field] not in ["live", "settled", "upcoming"]:
                    return _resp(False, {}, "status must be live, settled, or upcoming", 400)
                update_fields[field] = body[field]
            elif field == "b":
                update_fields[field] = float(body[field])
            else:
                update_fields[field] = body[field]

    if not update_fields:
        return _resp(False, {}, "No valid fields to update", 400)

    db.markets.update_one({"_id": oid}, {"$set": update_fields})
    updated = db.markets.find_one({"_id": oid})

    return _resp(True, {"market": serialize_market(updated)}, "Market updated")


@markets_bp.route("/admin/markets/<market_id>", methods=["DELETE"])
@jwt_required()
def delete_market(market_id):
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    try:
        oid = ObjectId(market_id)
    except Exception:
        return _resp(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return _resp(False, {}, "Market not found", 404)

    if market.get("status") == "live":
        return _resp(False, {}, "Cannot delete a live market", 400)

    db.markets.delete_one({"_id": oid})
    return _resp(True, {}, "Market deleted")
