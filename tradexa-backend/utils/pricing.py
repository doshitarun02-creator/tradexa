import math
from bson import ObjectId


def _cost_function(yes_shares: float, no_shares: float, b: float) -> float:
    """LMSR cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))"""
    # Use log-sum-exp trick for numerical stability
    a = max(yes_shares / b, no_shares / b)
    return b * (a + math.log(math.exp(yes_shares / b - a) + math.exp(no_shares / b - a)))


def calculate_yes_price(yes_shares: float, no_shares: float, b: float) -> float:
    """
    Price of YES in LMSR (scaled to ₹10 total):
    raw_prob = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
    yes_price = raw_prob * 10
    """
    try:
        # Numerically stable via subtracting max
        diff = (yes_shares - no_shares) / b
        raw_prob = 1.0 / (1.0 + math.exp(-diff))
        return round(raw_prob * 10.0, 4)
    except OverflowError:
        return 10.0 if yes_shares > no_shares else 0.0


def calculate_no_price(yes_shares: float, no_shares: float, b: float) -> float:
    """no_price = 10 - yes_price, ensuring they always sum to 10."""
    return round(10.0 - calculate_yes_price(yes_shares, no_shares, b), 4)


def get_cost_of_trade(
    yes_shares: float,
    no_shares: float,
    b: float,
    side: str,
    quantity: int,
) -> float:
    """
    Cost to buy `quantity` shares of `side`.
    cost = C(q1_new, q2_new) - C(q1_old, q2_old)
    Returns positive float representing ₹ cost.
    """
    cost_before = _cost_function(yes_shares, no_shares, b)

    if side == "yes":
        cost_after = _cost_function(yes_shares + quantity, no_shares, b)
    else:
        cost_after = _cost_function(yes_shares, no_shares + quantity, b)

    cost = cost_after - cost_before
    return round(max(cost, 0.01), 4)


def update_market_after_trade(db, market_oid: ObjectId, side: str, quantity: int, cost: float) -> dict:
    """
    Update market's share counts, prices, volume, and unique traders count.
    Returns the updated market document.
    """
    market = db.markets.find_one({"_id": market_oid})
    if not market:
        return None

    yes_shares = market.get("yes_shares", 0.0)
    no_shares = market.get("no_shares", 0.0)
    b = market.get("b", 100.0)

    if side == "yes":
        yes_shares += quantity
    else:
        no_shares += quantity

    new_yes_price = calculate_yes_price(yes_shares, no_shares, b)
    new_no_price = calculate_no_price(yes_shares, no_shares, b)

    db.markets.update_one(
        {"_id": market_oid},
        {
            "$set": {
                "yes_shares": yes_shares,
                "no_shares": no_shares,
                "yes_price": new_yes_price,
                "no_price": new_no_price,
            },
            "$inc": {"volume": cost},
        }
    )

    return db.markets.find_one({"_id": market_oid})
