from bson import ObjectId
from datetime import datetime, timezone


def settle_market(db, market_oid: ObjectId, winning_side: str) -> dict:
    """
    Settle a market by crediting winners and marking losers.
    Idempotent: will not re-settle an already-settled market.

    Returns dict with settled_count and total_payout.
    """
    market = db.markets.find_one({"_id": market_oid})
    if not market or market.get("status") == "settled":
        return {"settled_count": 0, "total_payout": 0.0}

    open_trades = list(db.trades.find({"market_id": market_oid, "status": "open"}))

    settled_count = 0
    total_payout = 0.0

    for trade in open_trades:
        user_oid = trade["user_id"]
        side = trade.get("side")
        quantity = trade.get("quantity", 0)
        price_per_share = trade.get("price_per_share", 0.0)
        total_cost = trade.get("total_cost", 0.0)

        if side == winning_side:
            # Winner: gets ₹10 per share
            payout = 10.0 * quantity
            pnl = round((10.0 - price_per_share) * quantity, 4)
            total_payout += payout

            db.users.update_one(
                {"_id": user_oid},
                {"$inc": {"wallet": payout, "wins": 1}}
            )
        else:
            # Loser: no wallet change (already deducted at trade time)
            pnl = round(-total_cost, 4)
            db.users.update_one(
                {"_id": user_oid},
                {"$inc": {"losses": 1}}
            )

        db.trades.update_one(
            {"_id": trade["_id"]},
            {"$set": {"status": "settled", "pnl": pnl}}
        )
        settled_count += 1

    db.markets.update_one(
        {"_id": market_oid},
        {"$set": {
            "status": "settled",
            "winning_side": winning_side,
        }}
    )

    return {"settled_count": settled_count, "total_payout": round(total_payout, 2)}
