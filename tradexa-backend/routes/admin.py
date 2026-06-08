from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
from datetime import datetime, timezone

from models.user import serialize_user
from models.market import serialize_market
from utils.settlement import settle_market

admin_bp = Blueprint("admin", __name__)


def _resp(success, data, message, status=200):
    return {"success": success, "data": data, "message": message}, status


def _require_admin(claims):
    if claims.get("role") != "admin":
        return _resp(False, {}, "Admin access required", 403)
    return None


@admin_bp.route("/admin/markets/<market_id>/settle", methods=["POST"])
@jwt_required()
def settle(market_id):
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    body = request.get_json(silent=True) or {}
    winning_side = (body.get("winning_side") or "").lower()

    if winning_side not in ["yes", "no"]:
        return _resp(False, {}, "winning_side must be 'yes' or 'no'", 400)

    try:
        oid = ObjectId(market_id)
    except Exception:
        return _resp(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return _resp(False, {}, "Market not found", 404)

    if market.get("status") == "settled":
        return _resp(False, {}, "Market already settled", 400)

    result = settle_market(db, oid, winning_side)
    updated_market = db.markets.find_one({"_id": oid})

    return _resp(True, {
        "market": serialize_market(updated_market),
        "settled_trades": result["settled_count"],
        "total_payout": result["total_payout"],
    }, "Market settled successfully")


@admin_bp.route("/admin/stats", methods=["GET"])
@jwt_required()
def stats():
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    total_users = db.users.count_documents({"role": "user"})
    total_markets = db.markets.count_documents({})
    live_markets = db.markets.count_documents({"status": "live"})
    settled_markets = db.markets.count_documents({"status": "settled"})
    upcoming_markets = db.markets.count_documents({"status": "upcoming"})
    total_trades = db.trades.count_documents({})

    volume_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}]
    vol_result = list(db.trades.aggregate(volume_pipeline))
    total_volume = round(vol_result[0]["total"], 2) if vol_result else 0.0

    wallet_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$wallet"}}}]
    wallet_result = list(db.users.aggregate(wallet_pipeline))
    total_wallet = round(wallet_result[0]["total"], 2) if wallet_result else 0.0

    return _resp(True, {
        "total_users": total_users,
        "total_markets": total_markets,
        "live_markets": live_markets,
        "settled_markets": settled_markets,
        "upcoming_markets": upcoming_markets,
        "total_trades": total_trades,
        "total_volume": total_volume,
        "total_wallet_balance": total_wallet,
    }, "Stats fetched")


@admin_bp.route("/admin/users", methods=["GET"])
@jwt_required()
def list_users():
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    page = max(int(request.args.get("page", 1)), 1)
    limit = min(int(request.args.get("limit", 20)), 50)
    skip = (page - 1) * limit

    users = list(db.users.find({}).sort("created_at", -1).skip(skip).limit(limit))
    total = db.users.count_documents({})

    return _resp(True, {
        "users": [serialize_user(u) for u in users],
        "total": total,
        "page": page,
        "limit": limit,
    }, "Users fetched")


@admin_bp.route("/admin/users/<user_id>/wallet", methods=["PATCH"])
@jwt_required()
def update_wallet(user_id):
    db = current_app.db
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    body = request.get_json(silent=True) or {}
    amount = body.get("amount")
    operation = body.get("operation", "set")  # set | add | subtract

    if amount is None:
        return _resp(False, {}, "amount is required", 400)

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return _resp(False, {}, "amount must be a number", 400)

    if amount < 0:
        return _resp(False, {}, "amount must be non-negative", 400)

    try:
        oid = ObjectId(user_id)
    except Exception:
        return _resp(False, {}, "Invalid user ID", 400)

    user = db.users.find_one({"_id": oid})
    if not user:
        return _resp(False, {}, "User not found", 404)

    if operation == "set":
        db.users.update_one({"_id": oid}, {"$set": {"wallet": amount}})
    elif operation == "add":
        db.users.update_one({"_id": oid}, {"$inc": {"wallet": amount}})
    elif operation == "subtract":
        if user.get("wallet", 0) < amount:
            return _resp(False, {}, "Insufficient wallet balance", 400)
        db.users.update_one({"_id": oid}, {"$inc": {"wallet": -amount}})
    else:
        return _resp(False, {}, "operation must be set, add, or subtract", 400)

    updated_user = db.users.find_one({"_id": oid})
    return _resp(True, {"user": serialize_user(updated_user)}, "Wallet updated")


@admin_bp.route("/admin/market-templates", methods=["GET"])
@jwt_required()
def market_templates():
    claims = get_jwt()
    err = _require_admin(claims)
    if err:
        return err

    templates = [
        # --- CRYPTO (8) ---
        {
            "question": "Will BTC cross $100,000 this week?",
            "category": "Crypto", "icon": "₿", "price_symbol": "BTC/USD",
        },
        {
            "question": "Will ETH cross $4,000 by end of this month?",
            "category": "Crypto", "icon": "Ξ", "price_symbol": "ETH/USD",
        },
        {
            "question": "Will SOL reach $200 before Sunday?",
            "category": "Crypto", "icon": "◎", "price_symbol": "SOL/USD",
        },
        {
            "question": "Will Bitcoin's market cap exceed $2 trillion this week?",
            "category": "Crypto", "icon": "₿", "price_symbol": "BTC Market Cap",
        },
        {
            "question": "Will BTC dominance stay above 50% this week?",
            "category": "Crypto", "icon": "📊", "price_symbol": "BTC.D",
        },
        {
            "question": "Will ETH/BTC ratio cross 0.06 this week?",
            "category": "Crypto", "icon": "Ξ", "price_symbol": "ETH/BTC",
        },
        {
            "question": "Will BNB cross $700 this week?",
            "category": "Crypto", "icon": "🔶", "price_symbol": "BNB/USD",
        },
        {
            "question": "Will XRP reach $1.00 before end of month?",
            "category": "Crypto", "icon": "✕", "price_symbol": "XRP/USD",
        },
        # --- FOREX (6) ---
        {
            "question": "Will USD/INR cross ₹86 this week?",
            "category": "Forex", "icon": "💱", "price_symbol": "USD/INR",
        },
        {
            "question": "Will RBI cut interest rates in the next meeting?",
            "category": "Forex", "icon": "🏦", "price_symbol": "RBI Repo Rate",
        },
        {
            "question": "Will EUR/USD stay above 1.08 this week?",
            "category": "Forex", "icon": "€", "price_symbol": "EUR/USD",
        },
        {
            "question": "Will GBP/USD cross 1.30 this week?",
            "category": "Forex", "icon": "£", "price_symbol": "GBP/USD",
        },
        {
            "question": "Will USD/INR fall below ₹83 this month?",
            "category": "Forex", "icon": "💱", "price_symbol": "USD/INR",
        },
        {
            "question": "Will JPY/USD stay below 0.0070 this week?",
            "category": "Forex", "icon": "¥", "price_symbol": "JPY/USD",
        },
        # --- MACRO (5) ---
        {
            "question": "Will the US Fed hold rates in the next FOMC meeting?",
            "category": "Macro", "icon": "🏛️", "price_symbol": "Fed Funds Rate",
        },
        {
            "question": "Will India's CPI inflation stay below 5% this month?",
            "category": "Macro", "icon": "📈", "price_symbol": "India CPI",
        },
        {
            "question": "Will India's GDP growth exceed 7% this quarter?",
            "category": "Macro", "icon": "🌏", "price_symbol": "India GDP",
        },
        {
            "question": "Will NIFTY 50 close above 23,000 this week?",
            "category": "Macro", "icon": "📊", "price_symbol": "NIFTY 50",
        },
        {
            "question": "Will US Non-Farm Payrolls beat expectations this month?",
            "category": "Macro", "icon": "💼", "price_symbol": "US NFP",
        },
        # --- STOCKS (4) ---
        {
            "question": "Will SENSEX close above 80,000 this week?",
            "category": "Stocks", "icon": "📈", "price_symbol": "BSE SENSEX",
        },
        {
            "question": "Will Nifty Bank cross 50,000 this week?",
            "category": "Stocks", "icon": "🏦", "price_symbol": "NIFTY Bank",
        },
        {
            "question": "Will Reliance Industries beat Q3 earnings estimates?",
            "category": "Stocks", "icon": "🛢️", "price_symbol": "RELIANCE",
        },
        {
            "question": "Will TCS revenue grow more than 10% YoY this quarter?",
            "category": "Stocks", "icon": "💻", "price_symbol": "TCS",
        },
        # --- COMMODITIES (4) ---
        {
            "question": "Will Gold cross $2,400/oz this week?",
            "category": "Commodities", "icon": "🥇", "price_symbol": "XAU/USD",
        },
        {
            "question": "Will Silver stay above $28/oz this week?",
            "category": "Commodities", "icon": "🥈", "price_symbol": "XAG/USD",
        },
        {
            "question": "Will Crude Oil (WTI) cross $90/barrel this month?",
            "category": "Commodities", "icon": "🛢️", "price_symbol": "WTI Crude",
        },
        {
            "question": "Will Brent Crude fall below $80/barrel this week?",
            "category": "Commodities", "icon": "⛽", "price_symbol": "Brent Crude",
        },
    ]

    return _resp(True, {"templates": templates, "count": len(templates)}, "Templates fetched")
