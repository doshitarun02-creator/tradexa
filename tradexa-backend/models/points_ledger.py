from datetime import datetime, timezone
from bson import ObjectId

LEDGER_TYPES = {
    "admin_credit": "Super admin manually credited points after receiving offline cash",
    "admin_debit": "Super admin manually deducted points (correction/penalty)",
    "trade_entry": "Points debited when a bet was placed",
    "trade_win": "Points credited when a settled trade won",
    "trade_loss": "Informational entry marking a settled trade as a loss (no balance change; debit already happened at trade_entry)",
    "refund": "Points refunded back to a user (e.g. cancelled market)",
    "redeem_request": "Informational entry logging a redeem request submission (no balance change)",
    "redeem_approved": "Points debited when a redeem/payout request was approved",
    "redeem_rejected": "Informational entry logging a redeem request rejection (no balance change)",
}


def create_points_ledger_entry(
    user_id,
    amount: float,
    entry_type: str,
    actor_id,
    reason: str,
    balance_before: float,
    balance_after: float,
    reference_type: str = None,
    reference_id: str = None,
) -> dict:
    """
    A signed ledger entry for every points balance mutation. `amount` is
    signed: positive for credits, negative for debits, zero for purely
    informational entries (trade_loss, redeem_request, redeem_rejected).
    `entry_type` must be one of LEDGER_TYPES.
    """
    if entry_type not in LEDGER_TYPES:
        raise ValueError(f"Unknown ledger entry_type: {entry_type}")

    return {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "amount": round(float(amount), 4),
        "type": entry_type,
        "actor_id": (ObjectId(actor_id) if isinstance(actor_id, str) else actor_id) if actor_id else None,
        "reason": reason,
        "balance_before": round(float(balance_before), 4),
        "balance_after": round(float(balance_after), 4),
        "reference_type": reference_type,
        "reference_id": str(reference_id) if reference_id else None,
        "created_at": datetime.now(timezone.utc),
    }


def serialize_points_ledger_entry(entry: dict) -> dict:
    if not entry:
        return None
    return {
        "id": str(entry["_id"]),
        "user_id": str(entry.get("user_id", "")),
        "amount": entry.get("amount", 0.0),
        "type": entry.get("type", ""),
        "actor_id": str(entry.get("actor_id")) if entry.get("actor_id") else None,
        "reason": entry.get("reason", ""),
        "balance_before": entry.get("balance_before", 0.0),
        "balance_after": entry.get("balance_after", 0.0),
        "reference_type": entry.get("reference_type"),
        "reference_id": entry.get("reference_id"),
        "created_at": entry.get("created_at").isoformat() if entry.get("created_at") else None,
    }
