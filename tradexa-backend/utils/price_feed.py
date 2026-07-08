import requests
import time
from datetime import datetime, timezone
from pymongo import ReturnDocument
from flask import current_app
from utils.logger import logger


COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
FAWAZ_BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies"

CRYPTO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
    "XRP": "ripple",
}

FOREX_PAIRS = ["usd", "eur", "gbp", "jpy"]


def _get_cached_prices(db):
    cached = db.price_cache.find_one({"type": "prices"}, sort=[("created_at", -1)])
    return cached.get("data") if cached else None


def _set_cached_prices(db, data: dict):
    db.price_cache.insert_one({
        "type": "prices",
        "data": data,
        "created_at": datetime.now(timezone.utc),
    })


def _fetch_crypto() -> dict:
    ids_str = ",".join(CRYPTO_IDS.values())
    resp = requests.get(
        COINGECKO_URL,
        params={
            "ids": ids_str,
            "vs_currencies": "usd,inr",
            "include_24hr_change": "true",
        },
        timeout=10,
    )
    resp.raise_for_status()
    raw = resp.json()

    result = {}
    for symbol, cg_id in CRYPTO_IDS.items():
        coin_data = raw.get(cg_id, {})
        result[symbol] = {
            "usd": coin_data.get("usd"),
            "inr": coin_data.get("inr"),
            "change_24h": round(coin_data.get("usd_24h_change", 0.0), 2),
        }
    return result


def _fetch_forex() -> dict:
    result = {}

    # Fetch INR rates from USD base
    try:
        resp = requests.get(f"{FAWAZ_BASE}/usd.json", timeout=10)
        resp.raise_for_status()
        usd_rates = resp.json().get("usd", {})

        result["USD/INR"] = {"rate": round(usd_rates.get("inr", 0), 4), "base": "USD", "quote": "INR"}

        eur_usd = usd_rates.get("eur")
        if eur_usd and eur_usd != 0:
            result["EUR/USD"] = {"rate": round(1 / eur_usd, 6), "base": "EUR", "quote": "USD"}
        else:
            result["EUR/USD"] = {"rate": None, "base": "EUR", "quote": "USD"}

        gbp_usd = usd_rates.get("gbp")
        if gbp_usd and gbp_usd != 0:
            result["GBP/USD"] = {"rate": round(1 / gbp_usd, 6), "base": "GBP", "quote": "USD"}
        else:
            result["GBP/USD"] = {"rate": None, "base": "GBP", "quote": "USD"}

        jpy_usd = usd_rates.get("jpy")
        if jpy_usd and jpy_usd != 0:
            result["JPY/USD"] = {"rate": round(1 / jpy_usd, 8), "base": "JPY", "quote": "USD"}
        else:
            result["JPY/USD"] = {"rate": None, "base": "JPY", "quote": "USD"}

    except Exception as e:
        result = {
            "USD/INR": {"rate": None, "base": "USD", "quote": "INR"},
            "EUR/USD": {"rate": None, "base": "EUR", "quote": "USD"},
            "GBP/USD": {"rate": None, "base": "GBP", "quote": "USD"},
            "JPY/USD": {"rate": None, "base": "JPY", "quote": "USD"},
            "error": str(e),
        }

    return result


def fetch_external_prices():
    crypto = {}
    forex = {}
    crypto_error = None
    forex_error = None

    try:
        crypto = _fetch_crypto()
    except Exception as e:
        crypto_error = str(e)

    try:
        forex = _fetch_forex()
    except Exception as e:
        forex_error = str(e)

    data = {
        "crypto": crypto,
        "forex": forex,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    if crypto_error:
        data["crypto_error"] = crypto_error
    if forex_error:
        data["forex_error"] = forex_error

    return data


def get_prices(db, fetch_external_prices):
    cached = db.price_cache.find_one({"_id": "prices"})
    if cached and (datetime.now(timezone.utc) - cached["updated_at"].replace(tzinfo=timezone.utc)).total_seconds() < 30:
        return cached["data"]

    lock = db.cache_locks.find_one_and_update(
        {"_id": "prices_lock"},
        {"$setOnInsert": {"locked_at": datetime.now(timezone.utc)}},
        upsert=True,
        return_document=ReturnDocument.BEFORE,
    )

    if lock is not None:
        for _ in range(3):
            time.sleep(0.5)
            cached = db.price_cache.find_one({"_id": "prices"})
            if cached:
                return cached["data"]
        return cached["data"] if cached else {}

    try:
        data = fetch_external_prices()
        db.price_cache.update_one(
            {"_id": "prices"},
            {"$set": {"data": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        return data
    except Exception as e:
        logger.exception("price_feed error")
        raise
    finally:
        db.cache_locks.delete_one({"_id": "prices_lock"})
