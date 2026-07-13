"""
Points Service — the ONLY module allowed to mutate `users.points_balance`.

Every balance change in TradeXa must go through one of the functions below.
Each function performs an atomic MongoDB update (find_one_and_update) and,
on success, writes a matching immutable entry to the points_ledger
collection. The ledger is the source of truth; `users.points_balance` is a
denormalized cache of the ledger's running total, kept in sync by always
writing through this service.

Do not call db.users.update_one(..., {"$inc": {"points_balance": ...}})
anywhere else in the codebase.
"""
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ReturnDocument

from models.points_ledger import create_points_ledger_entry


class InsufficientPointsError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class DuplicateLedgerEntryError(Exception):
    """Raised when a reference_type + reference_id + type combination
    already has a ledger entry, preventing double-credit/double-debit."""
    pass


def _to_oid(value):
    return ObjectId(value) if isinstance(value, str) else value


def _entry_already_exists(db, reference_type, reference_id, entry_type):
    if not reference_type or not reference_id:
        return False
    return db.points_ledger.find_one({
        "reference_type": reference_type,
        "reference_id": str(reference_id),
        "type": entry_type,
    }) is not None


def credit_points(db, user_id, amount, actor_id, reason, entry_type="admin_credit",
                   reference_type=None, reference_id=None):
    """Atomically increase a user's points_balance and write a ledger entry.
    Used for: admin_credit, trade_win, refund."""
    if amount <= 0:
        raise ValueError("credit_points amount must be positive")

    if _entry_already_exists(db, reference_type, reference_id, entry_type):
        raise DuplicateLedgerEntryError(
            f"Ledger entry of type '{entry_type}' already exists for {reference_type}:{reference_id}"
        )

    user_oid = _to_oid(user_id)
    updated_user = db.users.find_one_and_update(
        {"_id": user_oid},
        {"$inc": {"points_balance": amount}},
        return_document=ReturnDocument.AFTER,
    )
    if updated_user is None:
        raise UserNotFoundError(f"User {user_id} not found")

    balance_after = updated_user["points_balance"]
    balance_before = balance_after - amount

    entry = create_points_ledger_entry(
        user_id=user_oid, amount=amount, entry_type=entry_type, actor_id=actor_id,
        reason=reason, balance_before=balance_before, balance_after=balance_after,
        reference_type=reference_type, reference_id=reference_id,
    )
    db.points_ledger.insert_one(entry)
    return updated_user, entry


def debit_points(db, user_id, amount, actor_id, reason, entry_type="admin_debit",
                  reference_type=None, reference_id=None, allow_negative=False):
    """Atomically decrease a user's points_balance and write a ledger entry.
    Used for: admin_debit, trade_entry, redeem_approved.
    Raises InsufficientPointsError if the user doesn't have enough points
    (unless allow_negative=True, e.g. for admin corrections)."""
    if amount <= 0:
        raise ValueError("debit_points amount must be positive")

    if _entry_already_exists(db, reference_type, reference_id, entry_type):
        raise DuplicateLedgerEntryError(
            f"Ledger entry of type '{entry_type}' already exists for {reference_type}:{reference_id}"
        )

    user_oid = _to_oid(user_id)
    query = {"_id": user_oid}
    if not allow_negative:
        query["points_balance"] = {"$gte": amount}

    updated_user = db.users.find_one_and_update(
        query,
        {"$inc": {"points_balance": -amount}},
        return_document=ReturnDocument.AFTER,
    )
    if updated_user is None:
        exists = db.users.find_one({"_id": user_oid})
        if exists is None:
            raise UserNotFoundError(f"User {user_id} not found")
        raise InsufficientPointsError(
            f"User {user_id} has insufficient points balance for this debit of {amount}"
        )

    balance_after = updated_user["points_balance"]
    balance_before = balance_after + amount

    entry = create_points_ledger_entry(
        user_id=user_oid, amount=-amount, entry_type=entry_type, actor_id=actor_id,
        reason=reason, balance_before=balance_before, balance_after=balance_after,
        reference_type=reference_type, reference_id=reference_id,
    )
    db.points_ledger.insert_one(entry)
    return updated_user, entry


def log_informational_entry(db, user_id, entry_type, actor_id, reason,
                              reference_type=None, reference_id=None):
    """Writes a zero-amount ledger entry with no balance mutation.
    Used for: trade_loss, redeem_request, redeem_rejected."""
    if _entry_already_exists(db, reference_type, reference_id, entry_type):
        raise DuplicateLedgerEntryError(
            f"Ledger entry of type '{entry_type}' already exists for {reference_type}:{reference_id}"
        )

    user_oid = _to_oid(user_id)
    user = db.users.find_one({"_id": user_oid})
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")

    balance = user.get("points_balance", 0.0)
    entry = create_points_ledger_entry(
        user_id=user_oid, amount=0.0, entry_type=entry_type, actor_id=actor_id,
        reason=reason, balance_before=balance, balance_after=balance,
        reference_type=reference_type, reference_id=reference_id,
    )
    db.points_ledger.insert_one(entry)
    return entry


def reconcile_user_balance(db, user_id):
    """
    Recompute a user's points_balance purely from the ledger (sum of all
    `amount` fields) and compare it against the cached users.points_balance.
    Returns a dict describing whether they match, and by how much they
    differ if not. Does NOT auto-correct the cached balance — that should
    be a deliberate super_admin action after investigation.
    """
    user_oid = _to_oid(user_id)
    user = db.users.find_one({"_id": user_oid})
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")

    pipeline = [
        {"$match": {"user_id": user_oid}},
        {"$group": {"_id": None, "computed_balance": {"$sum": "$amount"}}},
    ]
    result = list(db.points_ledger.aggregate(pipeline))
    computed_balance = round(result[0]["computed_balance"], 4) if result else 0.0
    cached_balance = round(user.get("points_balance", 0.0), 4)
    difference = round(cached_balance - computed_balance, 4)

    return {
        "user_id": str(user_oid),
        "cached_balance": cached_balance,
        "computed_balance": computed_balance,
        "difference": difference,
        "is_consistent": abs(difference) < 0.01,
    }


def reconcile_all_users(db):
    """Runs reconcile_user_balance for every user, returns only mismatches."""
    mismatches = []
    for user in db.users.find({}, {"_id": 1}):
        result = reconcile_user_balance(db, user["_id"])
        if not result["is_consistent"]:
            mismatches.append(result)
    return mismatches
