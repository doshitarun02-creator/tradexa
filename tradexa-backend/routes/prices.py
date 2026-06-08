from flask import Blueprint, current_app
from utils.price_feed import get_prices
from utils.news_feed import get_news

prices_bp = Blueprint("prices", __name__)


def _resp(success, data, message, status=200):
    return {"success": success, "data": data, "message": message}, status


@prices_bp.route("/prices", methods=["GET"])
def prices():
    try:
        data = get_prices()
        return _resp(True, data, "Prices fetched")
    except Exception as e:
        return _resp(False, {}, f"Failed to fetch prices: {str(e)}", 500)


@prices_bp.route("/news", methods=["GET"])
def news():
    try:
        articles = get_news()
        return _resp(True, {"articles": articles}, "News fetched")
    except Exception as e:
        return _resp(False, {}, f"Failed to fetch news: {str(e)}", 500)
