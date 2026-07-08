import pytest
from bson import ObjectId
from utils.pricing import calculate_yes_price, calculate_no_price, get_cost_of_trade, update_market_after_trade, MarketVersionConflict

def test_prices_sum_to_ten():
    yes_shares, no_shares, b = 50, 30, 100
    yp = calculate_yes_price(yes_shares, no_shares, b)
    np_ = calculate_no_price(yes_shares, no_shares, b)
    assert round(yp + np_, 4) == 10.0

def test_cost_monotonically_increasing():
    yes_shares, no_shares, b = 50, 30, 100
    costs = [get_cost_of_trade(yes_shares, no_shares, b, "yes", q) for q in range(1, 20)]
    assert all(costs[i] < costs[i+1] for i in range(len(costs)-1))

def test_extreme_imbalance_stability():
    yes_shares, no_shares, b = 100000, 1, 50
    yp = calculate_yes_price(yes_shares, no_shares, b)
    np_ = calculate_no_price(yes_shares, no_shares, b)
    assert 0 <= yp <= 10 and 0 <= np_ <= 10
    assert round(yp + np_, 2) == 10.0

def test_version_conflict_rejects_stale(db):
    market_oid = ObjectId()
    db.markets.insert_one({"_id": market_oid, "version": 2, "yes_shares": 10, "no_shares": 5, "volume": 0})
    with pytest.raises(MarketVersionConflict):
        update_market_after_trade(db, market_oid, expected_version=1, new_yes_shares=15, new_no_shares=5, cost=20)
