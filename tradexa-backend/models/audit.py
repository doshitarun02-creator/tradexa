"""
Admin audit log model.

Every admin action (market create/update/delete/settle, wallet adjustment,
user suspension, role changes) writes one document here. This collection is
append-only from the application's perspective — there are no update/delete
routes for it, only inserts and reads.
"""
from datetime import datetime, timezone
from bson import ObjectId


def create_audit_entry(
    actor_id: str,
    actor_role: str,
    action: str,
    target_type: str,
    target_id: str,
    before: dict = None,
    after: dict = None,
    metadata: dict = None,
    ip: str = None,
    user_agent: str = None,
) -> dict:
    return {
        "actor_id": ObjectId(actor_id) if actor_id else None,
        "actor_role": actor_role,
        "action": action,
        "target_type": target_type,
        "target_id": str(target_id) if target_id is not None else None,
        "before": before or {},
        "after": after or {},
        "metadata": metadata or {},
        "ip": ip,
        "user_agent": user_agent,
        "created_at": datetime.now(timezone.utc),
    }


def serialize_audit_entry(entry: dict) -> dict:
    if not entry:
        return None
    return {
        "id": str(entry["_id"]),
        "actor_id": str(entry.get("actor_id")) if entry.get("actor_id") else None,
        "actor_role": entry.get("actor_role", ""),
        "action": entry.get("action", ""),
        "target_type": entry.get("target_type", ""),
        "target_id": entry.get("target_id"),
        "before": entry.get("before", {}),
        "after": entry.get("after", {}),
        "metadata": entry.get("metadata", {}),
        "ip": entry.get("ip"),
        "user_agent": entry.get("user_agent"),
        "created_at": entry.get("created_at").isoformat() if entry.get("created_at") else None,
    }


def log_admin_action(
    db,
    actor_id: str,
    actor_role: str,
    action: str,
    target_type: str,
    target_id: str,
    before: dict = None,
    after: dict = None,
    metadata: dict = None,
    ip: str = None,
    user_agent: str = None,
):
    """Convenience helper: build + insert an audit entry in one call."""
    entry = create_audit_entry(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=before,
        after=after,
        metadata=metadata,
        ip=ip,
        user_agent=user_agent,
    )
    db.admin_audit_log.insert_one(entry)
