import requests
import time
from datetime import datetime, timezone
from pymongo import ReturnDocument
from flask import current_app
from config import Config
from utils.logger import logger


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


def fetch_external_news():
    return {"articles": _fetch_from_marketaux()}


def get_news(db, fetch_external_news):
    cached = db.news_cache.find_one({"_id": "news"})
    if cached and (datetime.now(timezone.utc) - cached["updated_at"].replace(tzinfo=timezone.utc)).total_seconds() < 60:
        return cached["data"]

    lock = db.cache_locks.find_one_and_update(
        {"_id": "news_lock"},
        {"$setOnInsert": {"locked_at": datetime.now(timezone.utc)}},
        upsert=True,
        return_document=ReturnDocument.BEFORE,
    )

    if lock is not None:
        for _ in range(3):
            time.sleep(0.5)
            cached = db.news_cache.find_one({"_id": "news"})
            if cached:
                return cached["data"]
        return cached["data"] if cached else {}

    try:
        data = fetch_external_news()
        db.news_cache.update_one(
            {"_id": "news"},
            {"$set": {"data": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        return data
    except Exception as e:
        logger.exception("news_feed error")
        raise
    finally:
        db.cache_locks.delete_one({"_id": "news_lock"})
