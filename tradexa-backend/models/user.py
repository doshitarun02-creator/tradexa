from datetime import datetime, timezone
from bson import ObjectId

DEFAULT_STARTING_POINTS = 1000.0


def create_user(name: str, email: str, password_hash: str, role: str = "user") -> dict:
    return {
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "points_balance": DEFAULT_STARTING_POINTS,
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
        "points_balance": round(user.get("points_balance", DEFAULT_STARTING_POINTS), 2),
        "role": user.get("role", "user"),
        "status": user.get("status", "active"),
        "wins": user.get("wins", 0),
        "losses": user.get("losses", 0),
        "total_trades": user.get("total_trades", 0),
        "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
    }


def is_super_admin(user_or_claims: dict) -> bool:
    return user_or_claims.get("role") == "super_admin"
