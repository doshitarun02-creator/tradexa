import pytest
from bson import ObjectId
from datetime import datetime, timezone
from models.market import create_market, is_valid_market_transition
from services.points_service import credit_points


def test_transition_guards():
    # Valid transitions
    assert is_valid_market_transition("draft", "upcoming")
    assert is_valid_market_transition("upcoming", "live")
    assert is_valid_market_transition("live", "paused")
    assert is_valid_market_transition("live", "settling")
    assert is_valid_market_transition("paused", "live")
    assert is_valid_market_transition("settling", "settled")
    assert is_valid_market_transition("draft", "cancelled")
    assert is_valid_market_transition("paused", "cancelled")

    # Invalid transitions
    assert not is_valid_market_transition("draft", "live")
    assert not is_valid_market_transition("settled", "live")
    assert not is_valid_market_transition("cancelled", "draft")
    assert not is_valid_market_transition("settled", "cancelled")


def test_create_market_defaults():
    end_time = datetime.now(timezone.utc)
    # publish_immediately = False -> draft
    m1 = create_market("Question 1", "Crypto", "icon", "BTC", end_time, publish_immediately=False)
    assert m1["status"] == "draft"

    # publish_immediately = True -> upcoming
    m2 = create_market("Question 2", "Forex", "icon", "EUR", end_time, publish_immediately=True)
    assert m2["status"] == "upcoming"
