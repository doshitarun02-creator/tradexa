from datetime import datetime, timezone
from bson import ObjectId


def create_ledger_entry(
    user_id: str,
    amount: float,
    type: str,
    actor_id: str,
    reason: str,
    balance_before: float,
    balance_after: float,
) -> dict:
    """
    A signed ledger entry for every wallet mutation. `amount` is signed:
    positive for credits, negative for debits. `type` examples:
    'trade_debit', 'settlement_credit', 'admin_adjustment'.
    """
    return {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "amount": round(float(amount), 4),
        "type": type,
        "actor_id": ObjectId(actor_id) if actor_id else None,
        "reason": reason,
        "balance_before": round(float(balance_before), 4),
        "balance_after": round(float(balance_after), 4),
        "created_at": datetime.now(timezone.utc),
    }


def serialize_ledger_entry(entry: dict) -> dict:
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
        "created_at": entry.get("created_at").isoformat() if entry.get("created_at") else None,
    }
