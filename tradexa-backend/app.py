from flask import Flask, g, request
from flask_jwt_extended import JWTManager, get_jwt_identity, verify_jwt_in_request
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from datetime import datetime, timezone, timedelta
import uuid
import time

from config import Config
from utils.limiter import limiter
from utils.logger import logger
from utils.response import api_response

app = Flask(__name__)
app.config.from_object(Config)
Config.validate()

# JWT Cookie Configuration
app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_COOKIE_SECURE"] = (Config.FLASK_ENV == "production")
app.config["JWT_COOKIE_SAMESITE"] = "Strict"
app.config["JWT_COOKIE_CSRF_PROTECT"] = True
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"

CORS(app, resources={r"/api/*": {"origins": Config.cors_origins()}}, supports_credentials=True)

jwt = JWTManager(app)
limiter.init_app(app)

client = MongoClient(Config.MONGO_URI)
db = client.get_default_database()
app.db = db


@app.before_request
def before_request_hook():
    g.request_id = str(uuid.uuid4())
    g.start_time = time.time()
    try:
        verify_jwt_in_request(optional=True)
        g.user_id = get_jwt_identity()
    except Exception:
        g.user_id = None


@app.after_request
def after_request_hook(response):
    duration_ms = round((time.time() - g.start_time) * 1000, 2)
    logger.info(
        f"{request.method} {request.path} {response.status_code} {duration_ms}ms request_id={g.request_id}"
    )
    return response


def setup_indexes():
    # TTL indexes for cache collections
    try:
        db.price_cache.drop_index("created_at_1")
    except Exception:
        pass
    try:
        db.news_cache.drop_index("created_at_1")
    except Exception:
        pass

    try:
        db.price_cache.create_index(
            [("created_at", ASCENDING)],
            expireAfterSeconds=60,
            name="created_at_1"
        )
    except Exception:
        pass

    try:
        db.news_cache.create_index(
            [("created_at", ASCENDING)],
            expireAfterSeconds=900,
            name="created_at_1"
        )
    except Exception:
        pass

    try:
        db.users.create_index([("email", ASCENDING)], unique=True)
    except Exception:
        pass

    try:
        db.trades.create_index([("user_id", ASCENDING)])
    except Exception:
        pass

    try:
        db.trades.create_index([("market_id", ASCENDING)])
    except Exception:
        pass

    try:
        db.markets.create_index([("status", ASCENDING)])
    except Exception:
        pass

    try:
        db.markets.create_index([("category", ASCENDING)])
    except Exception:
        pass

    try:
        db.wallet_ledger.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    except Exception:
        pass

    try:
        db.users.create_index([("role", ASCENDING)])
    except Exception:
        pass

    try:
        db.admin_audit_log.create_index([("actor_id", ASCENDING)])
    except Exception:
        pass

    try:
        db.admin_audit_log.create_index([("target_type", ASCENDING), ("target_id", ASCENDING)])
    except Exception:
        pass

    try:
        db.admin_audit_log.create_index([("created_at", ASCENDING)])
    except Exception:
        pass

    try:
        db.cache_locks.create_index("locked_at", expireAfterSeconds=15)
    except Exception as exc:
        app.logger.warning(f"cache_locks TTL index setup failed: {exc}")

with app.app_context():
    setup_indexes()

from routes.auth import auth_bp
from routes.markets import markets_bp
from routes.trades import trades_bp
from routes.prices import prices_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(markets_bp, url_prefix="/api")
app.register_blueprint(trades_bp, url_prefix="/api")
app.register_blueprint(prices_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")


@app.route("/")
def health():
    return api_response(True, {}, "TradeXa API is live", 200)


@app.route("/healthz", methods=["GET"])
def healthz():
    try:
        db.command("ping")
        return api_response(True, {"mongo": "ok"}, "Healthy", 200)
    except Exception as e:
        logger.exception("Mongo health check failed")
        return api_response(False, {"mongo": "down"}, "Database unreachable", 503)


@app.errorhandler(429)
def ratelimit_handler(e):
    return api_response(False, {}, f"Rate limit exceeded: {e.description}", 429)


@app.errorhandler(404)
def not_found(e):
    return api_response(False, {}, "Route not found", 404)


@app.errorhandler(403)
def forbidden(e):
    return api_response(False, {}, "Forbidden", 403)


@app.errorhandler(500)
def server_error(e):
    return api_response(False, {}, "Internal server error", 500)


if __name__ == "__main__":
    app.run(debug=(Config.FLASK_ENV == "development"), port=5000)
