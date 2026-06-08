import requests
from datetime import datetime, timezone
from flask import current_app
from config import Config


MARKETAUX_URL = "https://api.marketaux.com/v1/news/all"


def _get_cached_news(db):
    cached = db.news_cache.find_one({"type": "news"}, sort=[("created_at", -1)])
    return cached.get("articles") if cached else None


def _set_cached_news(db, articles: list):
    db.news_cache.insert_one({
        "type": "news",
        "articles": articles,
        "created_at": datetime.now(timezone.utc),
    })


def _fetch_from_marketaux() -> list:
    if not Config.MARKETAUX_API_KEY:
        return []

    resp = requests.get(
        MARKETAUX_URL,
        params={
            "api_token": Config.MARKETAUX_API_KEY,
            "filter_entities": "true",
            "language": "en",
            "industries": "Financial Services,Technology,Energy,Commodities",
            "limit": 20,
        },
        timeout=10,
    )
    resp.raise_for_status()
    raw = resp.json()

    articles = []
    for item in raw.get("data", []):
        sentiment = None
        entities = item.get("entities", [])
        if entities:
            sentiment_scores = [e.get("sentiment_score", 0) for e in entities if e.get("sentiment_score") is not None]
            if sentiment_scores:
                avg = sum(sentiment_scores) / len(sentiment_scores)
                sentiment = "positive" if avg > 0.1 else ("negative" if avg < -0.1 else "neutral")

        articles.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "source": item.get("source", ""),
            "published_at": item.get("published_at", ""),
            "sentiment": sentiment,
            "description": item.get("description", ""),
            "image_url": item.get("image_url"),
        })

    return articles


def get_news() -> list:
    db = current_app.db
    cached = _get_cached_news(db)
    if cached is not None:
        return cached

    try:
        articles = _fetch_from_marketaux()
    except Exception as e:
        return [{"error": str(e), "title": "Failed to fetch news", "url": "", "source": "", "published_at": "", "sentiment": None}]

    _set_cached_news(db, articles)
    return articles
