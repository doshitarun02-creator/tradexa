from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone

from models.trade import create_trade, serialize_trade
from models.market import serialize_market
from models.user import serialize_user
from utils.pricing import get_cost_of_trade, update_market_after_trade

trades_bp = Blueprint("trades", __name__)


def _resp(success, data, message, status=200):
    return {"success": success, "data": data, "message": message}, status


@trades_bp.route("/trades", methods=["POST"])
@jwt_required()
def place_trade():
    db = current_app.db
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    market_id = body.get("market_id") or ""
    side = (body.get("side") or "").lower()
    quantity = body.get("quantity")

    if not market_id or side not in ["yes", "no"] or quantity is None:
        return _resp(False, {}, "market_id, side (yes/no), and quantity are required", 400)

    try:
        quantity = int(quantity)
    except (ValueError, TypeError):
        return _resp(False, {}, "quantity must be an integer", 400)

    if quantity < 1:
        return _resp(False, {}, "quantity must be at least 1", 400)

    try:
        market_oid = ObjectId(market_id)
    except Exception:
        return _resp(False, {}, "Invalid market_id", 400)

    market = db.markets.find_one({"_id": market_oid})
    if not market:
        return _resp(False, {}, "Market not found", 404)

    if market.get("status") != "live":
        return _resp(False, {}, "Market is not live", 400)

    if market.get("end_time") and market["end_time"].replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        return _resp(False, {}, "Market has expired", 400)

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return _resp(False, {}, "User not found", 404)

    yes_shares = market.get("yes_shares", 0.0)
    no_shares = market.get("no_shares", 0.0)
    b = market.get("b", 100.0)

    cost = get_cost_of_trade(yes_shares, no_shares, b, side, quantity)
    price_per_share = cost / quantity

    if user.get("wallet", 0) < cost:
        return _resp(False, {}, f"Insufficient wallet balance. Need ₹{cost:.2f}, have ₹{user['wallet']:.2f}", 400)

    trade_doc = create_trade(user_id, market_id, side, quantity, price_per_share, cost)
    trade_result = db.trades.insert_one(trade_doc)
    trade_doc["_id"] = trade_result.inserted_id

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"wallet": -cost, "total_trades": 1}}
    )

    updated_market = update_market_after_trade(db, market_oid, side, quantity, cost)
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})

    return _resp(True, {
        "trade": serialize_trade(trade_doc),
        "updated_market": serialize_market(updated_market),
        "new_wallet_balance": round(updated_user.get("wallet", 0), 2),
    }, "Trade placed successfully", 201)


@trades_bp.route("/my-trades", methods=["GET"])
@jwt_required()
def my_trades():
    db = current_app.db
    user_id = get_jwt_identity()
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(int(request.args.get("limit", 20)), 50)
    skip = (page - 1) * limit
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

    return _resp(True, {
        "trades": enriched,
        "total": total,
        "page": page,
        "limit": limit,
    }, "Trades fetched")


@trades_bp.route("/portfolio", methods=["GET"])
@jwt_required()
def portfolio():
    db = current_app.db
    user_id = get_jwt_identity()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return _resp(False, {}, "User not found", 404)

    open_trades = list(db.trades.find({"user_id": ObjectId(user_id), "status": "open"}))
    settled_trades = list(db.trades.find({"user_id": ObjectId(user_id), "status": "settled"}))

    market_ids = list({t["market_id"] for t in open_trades + settled_trades})
    markets = {str(m["_id"]): m for m in db.markets.find({"_id": {"$in": market_ids}})}

    open_positions = []
    total_invested = 0.0
    for t in open_trades:
        td = serialize_trade(t)
        td["market"] = serialize_market(markets.get(str(t["market_id"])))
        open_positions.append(td)
        total_invested += t.get("total_cost", 0)

    total_pnl = sum(
        t.get("pnl", 0) for t in settled_trades if t.get("pnl") is not None
    )
    wins = user.get("wins", 0)
    losses = user.get("losses", 0)
    total_settled = wins + losses
    win_rate = round((wins / total_settled * 100), 1) if total_settled > 0 else 0.0

    return _resp(True, {
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

    return _resp(True, {"leaderboard": board}, "Leaderboard fetched")
