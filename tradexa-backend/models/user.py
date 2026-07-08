from datetime import datetime, timezone
from bson import ObjectId


def create_user(name: str, email: str, password_hash: str, role: str = "user") -> dict:
    return {
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "wallet": 1000.0,
        "role": role,
        "status": "active",
        "wins": 0,
        "losses": 0,
        "total_trades": 0,
        "created_at": datetime.now(timezone.utc),
    }


def serialize_user(user: dict) -> dict:
    if not user:
        return None
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "wallet": user.get("wallet", 1000.0),
        "role": user.get("role", "user"),
        "status": user.get("status", "active"),
        "wins": user.get("wins", 0),
        "losses": user.get("losses", 0),
        "total_trades": user.get("total_trades", 0),
        "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
    }
