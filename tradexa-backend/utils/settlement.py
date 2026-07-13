from bson import ObjectId
from datetime import datetime, timezone

from services.points_service import credit_points, log_informational_entry, DuplicateLedgerEntryError


def settle_market(db, market_oid, winning_side: str, actor_id=None) -> dict:
    """
    Settle a market by crediting winners via the points ledger and marking
    losers. Uses an atomic status transition ('live'/'upcoming' -> 'settling')
    to lock out concurrent settlement attempts, and an atomic per-trade
    status transition ('open' -> 'settled') so a crashed/retried settlement
    run can never double-pay a trade that was already processed.
    """
    if isinstance(market_oid, str):
        try:
            market_oid = ObjectId(market_oid)
        except Exception:
            pass

    locked_market = db.markets.find_one_and_update(
        {"_id": market_oid, "status": {"$in": ["live", "upcoming"]}},
        {"$set": {"status": "settling"}},
        return_document=True,
    )
    if locked_market is None:
        return {"already_settling": True, "settled_count": 0, "total_payout": 0.0}

    open_trades = list(db.trades.find({
        "$or": [{"market_id": market_oid}, {"market_id": str(market_oid)}],
        "status": "open",
    }))

    settled_count = 0
    total_payout = 0.0

    for trade in open_trades:
        trade_id = trade["_id"]

        # Atomically claim this trade for settlement — if another process
        # already flipped it to 'settled', this returns None and we skip it.
        claimed_trade = db.trades.find_one_and_update(
            {"_id": trade_id, "status": "open"},
            {"$set": {"status": "settling"}},
            return_document=True,
        )
        if claimed_trade is None:
            continue

        user_id_field = trade.get("user_id")
        user_id = str(user_id_field) if isinstance(user_id_field, ObjectId) else user_id_field
        side = trade.get("side")
        quantity = trade.get("quantity") or trade.get("shares", 0)
        price_per_share = trade.get("price_per_share", 0.0)
        total_cost = trade.get("total_cost", 0.0)
        trade_id_str = str(trade_id)

        if side == winning_side:
            payout = round(10.0 * quantity, 4)
            pnl = round((10.0 - price_per_share) * quantity, 4)
            try:
                credit_points(
                    db, user_id=user_id, amount=payout, actor_id=actor_id,
                    reason=f"Points won on market {market_oid} (trade {trade_id_str})",
                    entry_type="trade_win",
                    reference_type="trade", reference_id=trade_id_str,
                )
            except DuplicateLedgerEntryError:
                pass  # already credited in a previous crashed/retried run
            db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"wins": 1}})
            total_payout += payout
        else:
            payout = 0.0
            pnl = round(-total_cost, 4)
            try:
                log_informational_entry(
                    db, user_id=user_id, entry_type="trade_loss", actor_id=actor_id,
                    reason=f"Points lost on market {market_oid} (trade {trade_id_str})",
                    reference_type="trade", reference_id=trade_id_str,
                )
            except DuplicateLedgerEntryError:
                pass
            db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"losses": 1}})

        db.trades.update_one(
            {"_id": trade_id},
            {"$set": {"status": "settled", "pnl": pnl, "payout": payout}},
        )
        settled_count += 1

    db.markets.update_one(
        {"_id": market_oid},
        {"$set": {"status": "settled", "winning_side": winning_side}},
    )

    return {
        "already_settling": False,
        "settled_count": settled_count,
        "total_payout": round(total_payout, 2),
    }
