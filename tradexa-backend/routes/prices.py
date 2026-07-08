from flask import Blueprint, current_app
from flask_jwt_extended import jwt_required
from utils.response import api_response
from utils.price_feed import get_prices, fetch_external_prices
from utils.news_feed import get_news, fetch_external_news

prices_bp = Blueprint("prices", __name__)


@prices_bp.route("/prices", methods=["GET"])
@jwt_required()
def prices():
    db = current_app.db
    try:
        data = get_prices(db, fetch_external_prices)
        return api_response(True, data, "Prices retrieved", 200)
    except Exception:
        return api_response(False, {}, "Failed to fetch prices, please try again shortly", 502)


@prices_bp.route("/news", methods=["GET"])
@jwt_required()
def news():
    db = current_app.db
    try:
        data = get_news(db, fetch_external_news)
        return api_response(True, data, "News retrieved", 200)
    except Exception:
        return api_response(False, {}, "Failed to fetch news, please try again shortly", 502)
