import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/tradexa")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7  # 7 days in seconds
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@tradexa.in")
    MARKETAUX_API_KEY = os.environ.get("MARKETAUX_API_KEY", "")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")

    @staticmethod
    def cors_origins():
        """Return list of allowed CORS origins based on environment."""
        frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        if os.environ.get("FLASK_ENV", "development") != "production":
            return [
                frontend,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        return [frontend]

    PORT = int(os.environ.get("PORT", "5000"))
