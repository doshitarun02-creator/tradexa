from datetime import datetime, timezone
from bson import ObjectId

VALID_STATUSES = ["pending", "approved", "rejected", "completed", "failed"]

# Allowed status transitions. Enforced centrally so no route can push a
# request into an invalid state.
ALLOWED_TRANSITIONS = {
    "pending": ["approved", "rejected"],
    "approved": ["completed", "failed"],
    "rejected": [],
    "completed": [],
    "failed": [],
}


def is_valid_transition(current_status: str, next_status: str) -> bool:
    return next_status in ALLOWED_TRANSITIONS.get(current_status, [])


def create_redemption(user_id, points_requested: float, payout_method: str,
                       payout_details: str, note_by_user: str = None) -> dict:
    return {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "points_requested": round(float(points_requested), 2),
        "status": "pending",
        "payout_method": payout_method,
        "payout_details": payout_details,
        "note_by_user": note_by_user,
        "note_by_admin": None,
        "approved_by": None,
        "approved_at": None,
        "rejected_by": None,
        "rejected_at": None,
        "completed_at": None,
        "created_at": datetime.now(timezone.utc),
    }


def serialize_redemption(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc.get("user_id", "")),
        "points_requested": doc.get("points_requested", 0.0),
        "status": doc.get("status", "pending"),
        "payout_method": doc.get("payout_method", ""),
        "payout_details": doc.get("payout_details", ""),
        "note_by_user": doc.get("note_by_user"),
        "note_by_admin": doc.get("note_by_admin"),
        "approved_by": str(doc["approved_by"]) if doc.get("approved_by") else None,
        "approved_at": doc["approved_at"].isoformat() if doc.get("approved_at") else None,
        "rejected_by": str(doc["rejected_by"]) if doc.get("rejected_by") else None,
        "rejected_at": doc["rejected_at"].isoformat() if doc.get("rejected_at") else None,
        "completed_at": doc["completed_at"].isoformat() if doc.get("completed_at") else None,
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }
