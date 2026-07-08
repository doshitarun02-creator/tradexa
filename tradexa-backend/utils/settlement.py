from bson import ObjectId
from datetime import datetime, timezone

def settle_market(db, market_oid, winning_side: str) -> dict:
    """
    Settle a market by crediting winners and marking losers.
    Locks the market in 'settling' state to prevent concurrent double-settlements.
    Supports string or ObjectId IDs and quantity/shares mapping.
    """
    if isinstance(market_oid, str):
        try:
            market_oid = ObjectId(market_oid)
        except Exception:
            pass

    market = db.markets.find_one({"_id": market_oid})
    if not market:
        return {"already_settling": False, "settled_count": 0, "total_payout": 0.0}

    status = market.get("status")
    if status == "settled" or status == "settling":
        return {"already_settling": True, "settled_count": 0, "total_payout": 0.0}

    # Set status to settling to lock concurrent settlements
    db.markets.update_one({"_id": market_oid}, {"$set": {"status": "settling"}})

    # Fetch open trades (market_id can be ObjectId or string)
    open_trades = list(db.trades.find({
        "$or": [
            {"market_id": market_oid},
            {"market_id": str(market_oid)}
        ],
        "status": "open"
    }))

    settled_count = 0
    total_payout = 0.0

    for trade in open_trades:
        user_id_field = trade.get("user_id")
        try:
            user_oid = ObjectId(user_id_field) if isinstance(user_id_field, str) else user_id_field
        except Exception:
            user_oid = user_id_field

        side = trade.get("side")
        quantity = trade.get("quantity") or trade.get("shares", 0)
        price_per_share = trade.get("price_per_share", 0.0)
        total_cost = trade.get("total_cost", 0.0)

        if side == winning_side:
            payout = 10.0 * quantity
            pnl = round((10.0 - price_per_share) * quantity, 4)
            total_payout += payout

            db.users.update_one(
                {"_id": user_oid},
                {"$inc": {"wallet": payout, "wins": 1}}
            )
        else:
            payout = 0.0
            pnl = round(-total_cost, 4)
            db.users.update_one(
                {"_id": user_oid},
                {"$inc": {"losses": 1}}
            )

        db.trades.update_one(
            {"_id": trade["_id"]},
            {"$set": {"status": "settled", "pnl": pnl, "payout": payout}}
        )
        settled_count += 1

    db.markets.update_one(
        {"_id": market_oid},
        {"$set": {
            "status": "settled",
            "winning_side": winning_side,
        }}
    )

    return {
        "already_settling": False,
        "settled_count": settled_count,
        "total_payout": round(total_payout, 2)
    }
