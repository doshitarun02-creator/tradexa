import requests
from datetime import datetime, timezone
from flask import current_app


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


def get_prices() -> dict:
    db = current_app.db
    cached = _get_cached_prices(db)
    if cached:
        return cached

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

    if crypto or forex:
        _set_cached_prices(db, data)

    return data
