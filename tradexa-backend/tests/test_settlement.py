from bson import ObjectId
from utils.settlement import settle_market

def test_winners_paid_correctly(db):
    market_oid = ObjectId()
    user_oid = ObjectId()
    db.markets.insert_one({"_id": market_oid, "status": "live"})
    db.users.insert_one({"_id": user_oid, "points_balance": 0})
    trade_id = db.trades.insert_one({"user_id": str(user_oid), "market_id": str(market_oid), "side": "yes", "shares": 5, "status": "open"}).inserted_id

    result = settle_market(db, str(market_oid), "yes")
    trade = db.trades.find_one({"_id": trade_id})
    user = db.users.find_one({"_id": user_oid})

    assert trade["payout"] == 50.0
    assert user["points_balance"] == 50.0
    assert result["already_settling"] is False

def test_losers_get_zero_payout(db):
    market_oid = ObjectId()
    user_oid = ObjectId()
    db.markets.insert_one({"_id": market_oid, "status": "live"})
    db.users.insert_one({"_id": user_oid, "points_balance": 0})
    trade_id = db.trades.insert_one({"user_id": str(user_oid), "market_id": str(market_oid), "side": "no", "shares": 5, "status": "open"}).inserted_id

    settle_market(db, str(market_oid), "yes")
    trade = db.trades.find_one({"_id": trade_id})
    assert trade["payout"] == 0.0

def test_double_settlement_is_noop(db):
    market_oid = ObjectId()
    db.markets.insert_one({"_id": market_oid, "status": "live"})
    settle_market(db, str(market_oid), "yes")
    second_result = settle_market(db, str(market_oid), "yes")
    assert second_result["already_settling"] is True
    assert second_result["settled_count"] == 0

def test_settling_state_blocks_concurrent(db):
    market_oid = ObjectId()
    db.markets.insert_one({"_id": market_oid, "status": "settling"})
    result = settle_market(db, str(market_oid), "yes")
    assert result["already_settling"] is True
