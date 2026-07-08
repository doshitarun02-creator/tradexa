from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import ValidationError

from models.user import serialize_user
from models.market import serialize_market
from models.audit import log_admin_action, serialize_audit_entry
from models.wallet_ledger import create_ledger_entry, serialize_ledger_entry
from utils.settlement import settle_market
from utils.permissions import (
    require_permission,
    require_any_admin_role,
    ALL_ROLES,
    ROLE_SUPER_ADMIN,
    ROLE_USER,
    PERMISSIONS,
    ROLE_PERMISSIONS,
)
from utils.response import api_response
from utils.pagination import parse_pagination, PaginationError
from schemas.admin import WalletAdjustmentSchema
from utils.logger import logger

admin_bp = Blueprint("admin", __name__)


def _client_meta():
    return {
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent"),
    }


@admin_bp.route("/admin/markets/<market_id>/settle", methods=["POST"])
@require_permission("markets:settle")
def settle(market_id):
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    winning_side = (body.get("winning_side") or "").lower()

    if winning_side not in ["yes", "no"]:
        return api_response(False, {}, "winning_side must be 'yes' or 'no'", 400)

    try:
        oid = ObjectId(market_id)
    except Exception:
        return api_response(False, {}, "Invalid market ID", 400)

    market = db.markets.find_one({"_id": oid})
    if not market:
        return api_response(False, {}, "Market not found", 404)

    if market.get("status") in ["settled", "settling"]:
        return api_response(False, {}, "Market already settling or settled", 400)

    before_snapshot = serialize_market(market)

    try:
        result = settle_market(db, oid, winning_side)
        updated_market = db.markets.find_one({"_id": oid})

        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="market_settle",
            target_type="market",
            target_id=market_id,
            before=before_snapshot,
            after=serialize_market(updated_market),
            metadata={
                "winning_side": winning_side,
                "settled_trades": result["settled_count"],
                "total_payout": result["total_payout"],
            },
            **_client_meta(),
        )

        return api_response(True, {
            "market": serialize_market(updated_market),
            "settled_trades": result["settled_count"],
            "total_payout": result["total_payout"],
        }, "Market settled successfully")
    except Exception as e:
        logger.exception("Market settlement failed")
        return api_response(False, {}, "Settlement failed, please try again", 500)


@admin_bp.route("/admin/stats", methods=["GET"])
@require_permission("stats:view")
def stats():
    db = current_app.db

    total_users = db.users.count_documents({"role": ROLE_USER})
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

    return api_response(True, {
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
@require_permission("users:view")
def list_users():
    db = current_app.db

    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    users = list(db.users.find({}).sort("created_at", -1).skip(skip).limit(limit))
    total = db.users.count_documents({})
    pages = (total + limit - 1) // limit

    return api_response(True, {
        "users": [serialize_user(u) for u in users],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }, "Users fetched")


@admin_bp.route("/admin/users/<user_id>/wallet", methods=["PATCH"])
@require_permission("wallet:adjust")
def update_wallet(user_id):
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    try:
        payload = WalletAdjustmentSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return api_response(False, {}, e.errors()[0]["msg"], 400)

    amount = payload.amount
    operation = payload.operation
    reason = payload.reason

    try:
        oid = ObjectId(user_id)
    except Exception:
        return api_response(False, {}, "Invalid user ID", 400)

    user = db.users.find_one({"_id": oid})
    if not user:
        return api_response(False, {}, "User not found", 404)

    balance_before = float(user.get("wallet", 0.0))

    try:
        if operation == "add":
            db.users.update_one({"_id": oid}, {"$inc": {"wallet": amount}})
            balance_after = balance_before + amount
        else:
            result = db.users.update_one(
                {"_id": oid, "wallet": {"$gte": amount}},
                {"$inc": {"wallet": -amount}},
            )
            if result.matched_count == 0:
                return api_response(False, {}, "Insufficient wallet balance", 400)
            balance_after = balance_before - amount

        db.wallet_ledger.insert_one(create_ledger_entry(
            user_id=user_id,
            amount=amount if operation == "add" else -amount,
            type="admin_adjustment",
            actor_id=actor_id,
            reason=reason,
            balance_before=balance_before,
            balance_after=balance_after,
        ))

        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="wallet_adjust",
            target_type="user",
            target_id=user_id,
            before={"wallet": balance_before},
            after={"wallet": balance_after},
            metadata={"operation": operation, "amount": amount, "reason": reason},
            **_client_meta(),
        )

        updated_user = db.users.find_one({"_id": oid})
        return api_response(True, {"user": serialize_user(updated_user)}, "Wallet updated")
    except Exception as e:
        logger.exception("Wallet update failed")
        return api_response(False, {}, "Failed to update wallet, please try again", 500)


@admin_bp.route("/admin/users/<user_id>/wallet-history", methods=["GET"])
@require_permission("wallet:adjust")
def wallet_history(user_id):
    db = current_app.db

    try:
        oid = ObjectId(user_id)
    except Exception:
        return api_response(False, {}, "Invalid user ID", 400)

    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    entries = list(
        db.wallet_ledger.find({"user_id": oid}).sort("created_at", -1).skip(skip).limit(limit)
    )
    total = db.wallet_ledger.count_documents({"user_id": oid})
    pages = (total + limit - 1) // limit

    return api_response(True, {
        "entries": [serialize_ledger_entry(e) for e in entries],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }, "Wallet history retrieved")


@admin_bp.route("/admin/users/<user_id>/status", methods=["PATCH"])
@require_permission("users:suspend")
def update_user_status(user_id):
    """Suspend or reactivate a user account. Suspended users cannot log in or place trades."""
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    new_status = (body.get("status") or "").strip().lower()
    reason = (body.get("reason") or "").strip()

    if new_status not in ["active", "suspended"]:
        return api_response(False, {}, "status must be 'active' or 'suspended'", 400)
    if not reason or len(reason) < 5:
        return api_response(False, {}, "A reason (min 5 characters) is required", 400)

    try:
        oid = ObjectId(user_id)
    except Exception:
        return api_response(False, {}, "Invalid user ID", 400)

    user = db.users.find_one({"_id": oid})
    if not user:
        return api_response(False, {}, "User not found", 404)

    if user.get("role") == ROLE_SUPER_ADMIN and str(user["_id"]) != actor_id:
        return api_response(False, {}, "Cannot suspend another super_admin", 403)

    before_status = user.get("status", "active")

    try:
        db.users.update_one({"_id": oid}, {"$set": {"status": new_status}})
        updated_user = db.users.find_one({"_id": oid})

        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="user_status_change",
            target_type="user",
            target_id=user_id,
            before={"status": before_status},
            after={"status": new_status},
            metadata={"reason": reason},
            **_client_meta(),
        )

        return api_response(True, {"user": serialize_user(updated_user)}, "User status updated")
    except Exception as e:
        logger.exception("User status update failed")
        return api_response(False, {}, "Failed to update user status", 500)


@admin_bp.route("/admin/users/<user_id>/role", methods=["PATCH"])
@require_permission("roles:manage")
def update_user_role(user_id):
    """super_admin-only: change another user's role."""
    db = current_app.db
    claims = get_jwt()
    actor_id = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    new_role = (body.get("role") or "").strip()
    reason = (body.get("reason") or "").strip()

    if new_role not in ALL_ROLES:
        return api_response(False, {}, f"role must be one of: {', '.join(ALL_ROLES)}", 400)
    if not reason or len(reason) < 5:
        return api_response(False, {}, "A reason (min 5 characters) is required", 400)

    try:
        oid = ObjectId(user_id)
    except Exception:
        return api_response(False, {}, "Invalid user ID", 400)

    if str(oid) == actor_id and new_role != ROLE_SUPER_ADMIN:
        return api_response(False, {}, "You cannot demote yourself", 400)

    user = db.users.find_one({"_id": oid})
    if not user:
        return api_response(False, {}, "User not found", 404)

    before_role = user.get("role", "user")

    try:
        db.users.update_one({"_id": oid}, {"$set": {"role": new_role}})
        updated_user = db.users.find_one({"_id": oid})

        log_admin_action(
            db,
            actor_id=actor_id,
            actor_role=claims.get("role"),
            action="role_change",
            target_type="user",
            target_id=user_id,
            before={"role": before_role},
            after={"role": new_role},
            metadata={"reason": reason},
            **_client_meta(),
        )

        return api_response(True, {"user": serialize_user(updated_user)}, "User role updated")
    except Exception as e:
        logger.exception("User role change failed")
        return api_response(False, {}, "Failed to change user role", 500)


@admin_bp.route("/admin/audit-log", methods=["GET"])
@require_permission("audit:view")
def audit_log():
    db = current_app.db

    try:
        page, limit, skip = parse_pagination(request.args)
    except PaginationError as e:
        return api_response(False, {}, str(e), 400)

    action_filter = request.args.get("action")
    target_type_filter = request.args.get("target_type")

    query = {}
    if action_filter:
        query["action"] = action_filter
    if target_type_filter:
        query["target_type"] = target_type_filter

    total = db.admin_audit_log.count_documents(query)
    entries = list(db.admin_audit_log.find(query).sort("created_at", -1).skip(skip).limit(limit))
    pages = (total + limit - 1) // limit

    return api_response(True, {
        "entries": [serialize_audit_entry(e) for e in entries],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }, "Audit log retrieved", 200)


@admin_bp.route("/admin/permission-matrix", methods=["GET"])
@require_any_admin_role()
def permission_matrix():
    """
    Returns the full role -> permission matrix so the frontend can render
    role management UI without hardcoding the matrix in two places.
    """
    matrix = {role: sorted(perms) for role, perms in ROLE_PERMISSIONS.items()}
    return api_response(True, {
        "roles": ALL_ROLES,
        "permissions": PERMISSIONS,
        "matrix": matrix,
    }, "Permission matrix fetched")


@admin_bp.route("/admin/market-templates", methods=["GET"])
@require_permission("markets:templates:view")
def market_templates():
    templates = [
        # --- CRYPTO (8) ---
        {"question": "Will BTC cross $100,000 this week?", "category": "Crypto", "icon": "₿", "price_symbol": "BTC/USD"},
        {"question": "Will ETH cross $4,000 by end of this month?", "category": "Crypto", "icon": "Ξ", "price_symbol": "ETH/USD"},
        {"question": "Will SOL reach $200 before Sunday?", "category": "Crypto", "icon": "◎", "price_symbol": "SOL/USD"},
        {"question": "Will Bitcoin's market cap exceed $2 trillion this week?", "category": "Crypto", "icon": "₿", "price_symbol": "BTC Market Cap"},
        {"question": "Will BTC dominance stay above 50% this week?", "category": "Crypto", "icon": "📊", "price_symbol": "BTC.D"},
        {"question": "Will ETH/BTC ratio cross 0.06 this week?", "category": "Crypto", "icon": "Ξ", "price_symbol": "ETH/BTC"},
        {"question": "Will BNB cross $700 this week?", "category": "Crypto", "icon": "🔶", "price_symbol": "BNB/USD"},
        {"question": "Will XRP reach $1.00 before end of month?", "category": "Crypto", "icon": "✕", "price_symbol": "XRP/USD"},
        # --- FOREX (6) ---
        {"question": "Will USD/INR cross ₹86 this week?", "category": "Forex", "icon": "💱", "price_symbol": "USD/INR"},
        {"question": "Will RBI cut interest rates in the next meeting?", "category": "Forex", "icon": "🏦", "price_symbol": "RBI Repo Rate"},
        {"question": "Will EUR/USD stay above 1.08 this week?", "category": "Forex", "icon": "€", "price_symbol": "EUR/USD"},
        {"question": "Will GBP/USD cross 1.30 this week?", "category": "Forex", "icon": "£", "price_symbol": "GBP/USD"},
        {"question": "Will USD/INR fall below ₹83 this month?", "category": "Forex", "icon": "💱", "price_symbol": "USD/INR"},
        {"question": "Will JPY/USD stay below 0.0070 this week?", "category": "Forex", "icon": "¥", "price_symbol": "JPY/USD"},
        # --- MACRO (5) ---
        {"question": "Will the US Fed hold rates in the next FOMC meeting?", "category": "Macro", "icon": "🏛️", "price_symbol": "Fed Funds Rate"},
        {"question": "Will India's CPI inflation stay below 5% this month?", "category": "Macro", "icon": "📈", "price_symbol": "India CPI"},
        {"question": "Will India's GDP growth exceed 7% this quarter?", "category": "Macro", "icon": "🌏", "price_symbol": "India GDP"},
        {"question": "Will NIFTY 50 close above 23,000 this week?", "category": "Macro", "icon": "📊", "price_symbol": "NIFTY 50"},
        {"question": "Will US Non-Farm Payrolls beat expectations this month?", "category": "Macro", "icon": "💼", "price_symbol": "US NFP"},
        # --- STOCKS (4) ---
        {"question": "Will SENSEX close above 80,000 this week?", "category": "Stocks", "icon": "📈", "price_symbol": "BSE SENSEX"},
        {"question": "Will Nifty Bank cross 50,000 this week?", "category": "Stocks", "icon": "🏦", "price_symbol": "NIFTY Bank"},
        {"question": "Will Reliance Industries beat Q3 earnings estimates?", "category": "Stocks", "icon": "🛢️", "price_symbol": "RELIANCE"},
        {"question": "Will TCS revenue grow more than 10% YoY this quarter?", "category": "Stocks", "icon": "💻", "price_symbol": "TCS"},
        # --- COMMODITIES (4) ---
        {"question": "Will Gold cross $2,400/oz this week?", "category": "Commodities", "icon": "🥇", "price_symbol": "XAU/USD"},
        {"question": "Will Silver stay above $28/oz this week?", "category": "Commodities", "icon": "🥈", "price_symbol": "XAG/USD"},
        {"question": "Will Crude Oil (WTI) cross $90/barrel this week?", "category": "Commodities", "icon": "🛢️", "price_symbol": "WTI"},
        {"question": "Will Natural Gas stay above $3/MMBtu this week?", "category": "Commodities", "icon": "🔥", "price_symbol": "NATGAS"},
    ]
    return api_response(True, {"templates": templates, "count": len(templates)}, "Templates fetched")
