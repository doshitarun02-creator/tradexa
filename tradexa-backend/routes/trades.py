from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import ValidationError

from models.trade import create_trade, serialize_trade
from models.market import serialize_market
from models.user import serialize_user
from utils.pricing import get_cost_of_trade, update_market_after_trade
from utils.limiter import limiter
from utils.response import api_response
from utils.pagination import parse_pagination, PaginationError
from schemas.trade import PlaceTradeSchema

trades_bp = Blueprint("trades", __name__)


@trades_bp.route("/trades", methods=["POST"])
@limiter.limit("20 per minute")
@jwt_required()
def place_trade():
    db = current_app.db
    user_id = get_jwt_identity()
    try:
        payload = PlaceTradeSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    market_id = payload.market_id
    side = payload.side
    quantity = payload.quantity

    try:
        market_oid = ObjectId(market_id)
    except Exception:
        return api_response(False, {}, "Invalid market_id", 400)

    market = db.markets.find_one({"_id": market_oid})
    if not market:
        return api_response(False, {}, "Market not found", 404)

    if market.get("status") != "live":
        return api_response(False, {}, "Market is not live", 400)

    if market.get("end_time") and market["end_time"].replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        return api_response(False, {}, "Market has expired", 400)

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return api_response(False, {}, "User not found", 404)

    if user.get("status", "active") != "active":
        return api_response(False, {}, "Your account is suspended. Contact an administrator.", 403)

    yes_shares = market.get("yes_shares", 0.0)
    no_shares = market.get("no_shares", 0.0)
    b = market.get("b", 100.0)

    cost = get_cost_of_trade(yes_shares, no_shares, b, side, quantity)
    price_per_share = cost / quantity

    if user.get("wallet", 0) < cost:
        return api_response(False, {}, f"Insufficient wallet balance. Need ₹{cost:.2f}, have ₹{user['wallet']:.2f}", 400)

    trade_doc = create_trade(user_id, market_id, side, quantity, price_per_share, cost)
    trade_result = db.trades.insert_one(trade_doc)
    trade_doc["_id"] = trade_result.inserted_id

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"wallet": -cost, "total_trades": 1}}
    )

    updated_market = update_market_after_trade(db, market_oid, side, quantity, cost)
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})

    return api_response(True, {
        "trade": serialize_trade(trade_doc),
        "updated_market": serialize_market(updated_market),
        "new_wallet_balance": round(updated_user.get("wallet", 0), 2),
    }, "Trade placed successfully", 201)


@trades_bp.route("/my-trades", methods=["GET"])
@jwt_required()
def my_trades():
    db = current_app.db
    user_id = get_jwt_identity()
    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    status_filter = request.args.get("status")
    query = {"user_id": ObjectId(user_id)}
    if status_filter in ["open", "settled"]:
        query["status"] = status_filter

    trades = list(db.trades.find(query).sort("created_at", -1).skip(skip).limit(limit))
    total = db.trades.count_documents(query)

    market_ids = list({t["market_id"] for t in trades})
    markets = {str(m["_id"]): m for m in db.markets.find({"_id": {"$in": market_ids}})}

    enriched = []
    for t in trades:
        td = serialize_trade(t)
        td["market"] = serialize_market(markets.get(str(t["market_id"])))
        enriched.append(td)

    pages = (total + limit - 1) // limit

    return api_response(True, {
        "trades": enriched,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }, "Trades fetched")


@trades_bp.route("/portfolio", methods=["GET"])
@jwt_required()
def portfolio():
    db = current_app.db
    user_id = get_jwt_identity()
    user_oid = ObjectId(user_id)

    user = db.users.find_one({"_id": user_oid})
    if not user:
        return api_response(False, {}, "User not found", 404)

    pnl_pipeline = [
        {"$match": {"user_id": user_oid, "status": "settled"}},
        {"$group": {"_id": None, "total_pnl": {"$sum": "$pnl"}}},
    ]
    pnl_result = list(db.trades.aggregate(pnl_pipeline))
    total_pnl = pnl_result[0]["total_pnl"] if pnl_result else 0.0

    invested_pipeline = [
        {"$match": {"user_id": user_oid, "status": "open"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}},
    ]
    invested_result = list(db.trades.aggregate(invested_pipeline))
    total_invested = invested_result[0]["total"] if invested_result else 0.0

    # Bounded fetch: open positions capped at 200 for stability
    open_trades = list(db.trades.find({"user_id": user_oid, "status": "open"}).limit(200))
    open_positions = []
    if open_trades:
        market_ids = list({t["market_id"] for t in open_trades})
        markets = {str(m["_id"]): m for m in db.markets.find({"_id": {"$in": market_ids}})}
        for t in open_trades:
            td = serialize_trade(t)
            td["market"] = serialize_market(markets.get(str(t["market_id"])))
            open_positions.append(td)

    wins = user.get("wins", 0)
    losses = user.get("losses", 0)
    total_settled = wins + losses
    win_rate = round((wins / total_settled * 100), 1) if total_settled > 0 else 0.0

    return api_response(True, {
        "wallet": round(user.get("wallet", 0), 2),
        "total_invested": round(total_invested, 2),
        "total_pnl": round(total_pnl, 2),
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "total_trades": user.get("total_trades", 0),
        "open_positions": open_positions,
    }, "Portfolio fetched")


@trades_bp.route("/leaderboard", methods=["GET"])
def leaderboard():
    db = current_app.db
    limit = min(int(request.args.get("limit", 20)), 50)

    top_users = list(
        db.users.find(
            {"role": "user"},
            {"name": 1, "wallet": 1, "wins": 1, "losses": 1, "total_trades": 1}
        )
        .sort("wallet", -1)
        .limit(limit)
    )

    board = []
    for rank, u in enumerate(top_users, start=1):
        total = u.get("wins", 0) + u.get("losses", 0)
        win_rate = round(u["wins"] / total * 100, 1) if total > 0 else 0.0
        board.append({
            "rank": rank,
            "id": str(u["_id"]),
            "name": u.get("name", ""),
            "wallet": round(u.get("wallet", 0), 2),
            "wins": u.get("wins", 0),
            "losses": u.get("losses", 0),
            "total_trades": u.get("total_trades", 0),
            "win_rate": win_rate,
        })

    return api_response(True, {"leaderboard": board}, "Leaderboard fetched")
