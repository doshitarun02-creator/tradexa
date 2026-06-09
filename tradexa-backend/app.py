from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from datetime import datetime, timezone, timedelta
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)

CORS(app, resources={r"/api/*": {"origins": Config.cors_origins()}}, supports_credentials=True)

jwt = JWTManager(app)

client = MongoClient(Config.MONGO_URI)
db = client.get_default_database()
app.db = db

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
    return {"success": True, "message": "TradeXa API is live", "data": {}}, 200

@app.errorhandler(404)
def not_found(e):
    return {"success": False, "message": "Route not found", "data": {}}, 404

@app.errorhandler(500)
def server_error(e):
    return {"success": False, "message": "Internal server error", "data": {}}, 500

if __name__ == "__main__":
    app.run(debug=(Config.FLASK_ENV == "development"), port=5000)
