import pytest
from bson import ObjectId
from models.redemption import create_redemption, is_valid_transition
from services.points_service import debit_points, credit_points, InsufficientPointsError


def _make_user(db, points_balance=1000.0):
    user_id = ObjectId()
    db.users.insert_one({"_id": user_id, "points_balance": points_balance, "status": "active"})
    return user_id


def test_create_redemption_request(db):
    user_id = _make_user(db)
    doc = create_redemption(user_id, 200.0, "upi", "test@upi")
    result = db.redeem_requests.insert_one(doc)
    saved = db.redeem_requests.find_one({"_id": result.inserted_id})
    assert saved["status"] == "pending"
    assert saved["points_requested"] == 200.0


def test_approve_redemption_debits_points(db):
    user_id = _make_user(db, points_balance=1000.0)
    doc = create_redemption(user_id, 300.0, "bank_transfer", "acc-123")
    result = db.redeem_requests.insert_one(doc)
    rid = str(result.inserted_id)

    db.redeem_requests.update_one({"_id": result.inserted_id}, {"$set": {"status": "approved"}})
    updated_user, entry = debit_points(
        db, user_id=user_id, amount=300.0, actor_id=ObjectId(), reason="approved",
        entry_type="redeem_approved", reference_type="redemption", reference_id=rid,
    )

    assert updated_user["points_balance"] == 700.0
    assert entry["type"] == "redeem_approved"
    assert entry["amount"] == -300.0


def test_reject_redemption_no_balance_change(db):
    user_id = _make_user(db, points_balance=500.0)
    doc = create_redemption(user_id, 100.0, "upi", "test@upi")
    result = db.redeem_requests.insert_one(doc)

    db.redeem_requests.update_one({"_id": result.inserted_id}, {"$set": {"status": "rejected"}})
    user = db.users.find_one({"_id": user_id})
    assert user["points_balance"] == 500.0


def test_complete_redemption_terminal_state(db):
    user_id = _make_user(db, points_balance=1000.0)
    doc = create_redemption(user_id, 200.0, "upi", "test@upi")
    result = db.redeem_requests.insert_one(doc)

    db.redeem_requests.update_one({"_id": result.inserted_id}, {"$set": {"status": "approved"}})
    db.redeem_requests.update_one({"_id": result.inserted_id}, {"$set": {"status": "completed"}})

    saved = db.redeem_requests.find_one({"_id": result.inserted_id})
    assert saved["status"] == "completed"
    assert not is_valid_transition("completed", "approved")
    assert not is_valid_transition("completed", "rejected")


def test_failed_redemption_refunds_points(db):
    user_id = _make_user(db, points_balance=1000.0)
    doc = create_redemption(user_id, 400.0, "bank_transfer", "acc-999")
    result = db.redeem_requests.insert_one(doc)
    rid = str(result.inserted_id)

    debit_points(
        db, user_id=user_id, amount=400.0, actor_id=ObjectId(), reason="approved",
        entry_type="redeem_approved", reference_type="redemption", reference_id=rid,
    )
    user_after_debit = db.users.find_one({"_id": user_id})
    assert user_after_debit["points_balance"] == 600.0

    credit_points(
        db, user_id=user_id, amount=400.0, actor_id=ObjectId(), reason="refund on failure",
        entry_type="refund", reference_type="redemption", reference_id=f"{rid}-refund",
    )
    user_after_refund = db.users.find_one({"_id": user_id})
    assert user_after_refund["points_balance"] == 1000.0


def test_invalid_transition_blocked():
    assert not is_valid_transition("pending", "completed")
    assert not is_valid_transition("rejected", "approved")
    assert is_valid_transition("pending", "approved")
    assert is_valid_transition("approved", "completed")
