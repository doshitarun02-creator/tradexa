from datetime import datetime, timezone

def create_market(
    question: str,
    category: str,
    icon: str,
    price_symbol: str,
    end_time: datetime,
    b: float = 100.0,
) -> dict:
    return {
        "question": question,
        "category": category,
        "icon": icon,
        "price_symbol": price_symbol,
        "yes_price": 5.0,
        "no_price": 5.0,
        "yes_shares": 0.0,
        "no_shares": 0.0,
        "b": b,
        "volume": 0.0,
        "traders": 0,
        "status": "upcoming",
        "winning_side": None,
        "end_time": end_time,
        "created_at": datetime.now(timezone.utc),
    }

def serialize_market(market: dict) -> dict:
    if not market:
        return None
    return {
        "id": str(market["_id"]),
        "question": market.get("question", ""),
        "category": market.get("category", ""),
        "icon": market.get("icon", ""),
        "price_symbol": market.get("price_symbol", ""),
        "yes_price": round(market.get("yes_price", 5.0), 4),
        "no_price": round(market.get("no_price", 5.0), 4),
        "yes_shares": market.get("yes_shares", 0.0),
        "no_shares": market.get("no_shares", 0.0),
        "b": market.get("b", 100.0),
        "volume": round(market.get("volume", 0.0), 2),
        "traders": market.get("traders", 0),
        "status": market.get("status", "upcoming"),
        "winning_side": market.get("winning_side"),
        "end_time": market.get("end_time").isoformat() if market.get("end_time") else None,
        "created_at": market.get("created_at").isoformat() if market.get("created_at") else None,
    }
