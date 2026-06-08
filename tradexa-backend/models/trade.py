from datetime import datetime, timezone
from bson import ObjectId

def create_trade(
    user_id: str,
    market_id: str,
    side: str,
    quantity: int,
    price_per_share: float,
    total_cost: float,
) -> dict:
    return {
        "user_id": ObjectId(user_id),
        "market_id": ObjectId(market_id),
        "side": side,
        "quantity": quantity,
        "price_per_share": price_per_share,
        "total_cost": total_cost,
        "status": "open",
        "pnl": None,
        "created_at": datetime.now(timezone.utc),
    }

def serialize_trade(trade: dict) -> dict:
    if not trade:
        return None
    return {
        "id": str(trade["_id"]),
        "user_id": str(trade.get("user_id", "")),
        "market_id": str(trade.get("market_id", "")),
        "side": trade.get("side", ""),
        "quantity": trade.get("quantity", 0),
        "price_per_share": round(trade.get("price_per_share", 0.0), 4),
        "total_cost": round(trade.get("total_cost", 0.0), 2),
        "status": trade.get("status", "open"),
        "pnl": round(trade.get("pnl", 0.0), 2) if trade.get("pnl") is not None else None,
        "created_at": trade.get("created_at").isoformat() if trade.get("created_at") else None,
    }
