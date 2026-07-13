import os
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables
load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/tradexa")

def seed():
    print(f"Connecting to MongoDB: {MONGO_URI}")
    client = MongoClient(MONGO_URI)
    
    # Extract database name from connection string or default
    db = client.get_default_database()
    
    # Clean existing markets for fresh start
    print("Clearing existing markets...")
    db.markets.drop()
    db.trades.drop()
    
    # Reset user stats (wins/losses/trades) for a clean demo
    print("Resetting user trade statistics...")
    db.users.update_many(
        {},
        {"$set": {"wins": 0, "losses": 0, "total_trades": 0, "points_balance": 10000.0}}
    )

    now = datetime.now(timezone.utc)

    # 6 Live Markets
    markets = [
        {
            "question": "Will Bitcoin (BTC) cross $100,000 by the end of this week?",
            "category": "Crypto",
            "icon": "₿",
            "price_symbol": "BTC",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 100.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=4),
            "created_at": now - timedelta(days=1),
        },
        {
            "question": "Will Ethereum (ETH) exceed $4,000 by the end of this month?",
            "category": "Crypto",
            "icon": "Ξ",
            "price_symbol": "ETH",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 100.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=20),
            "created_at": now - timedelta(days=2),
        },
        {
            "question": "Will USD/INR close above ₹85.50 by Friday?",
            "category": "Forex",
            "icon": "💱",
            "price_symbol": "USD/INR",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 100.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=3),
            "created_at": now - timedelta(days=1),
        },
        {
            "question": "Will the US Federal Reserve cut interest rates at the next meeting?",
            "category": "Macro",
            "icon": "🏦",
            "price_symbol": "Fed Funds Rate",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 150.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=15),
            "created_at": now - timedelta(days=3),
        },
        {
            "question": "Will NIFTY 50 close above 24,000 this week?",
            "category": "Stocks",
            "icon": "📈",
            "price_symbol": "NIFTY 50",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 100.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=4),
            "created_at": now - timedelta(days=1),
        },
        {
            "question": "Will Gold (XAU/USD) hit $2,500/oz before the end of the month?",
            "category": "Commodities",
            "icon": "🥇",
            "price_symbol": "GOLD",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 120.0,
            "volume": 0.0,
            "traders": 0,
            "status": "live",
            "winning_side": None,
            "end_time": now + timedelta(days=22),
            "created_at": now - timedelta(days=2),
        },
        # Upcoming Market
        {
            "question": "Will Solana (SOL) reach $250 next month?",
            "category": "Crypto",
            "icon": "◎",
            "price_symbol": "SOL",
            "yes_price": 5.0,
            "no_price": 5.0,
            "yes_shares": 0.0,
            "no_shares": 0.0,
            "b": 100.0,
            "volume": 0.0,
            "traders": 0,
            "status": "upcoming",
            "winning_side": None,
            "end_time": now + timedelta(days=45),
            "created_at": now,
        }
    ]

    print(f"Seeding {len(markets)} markets...")
    result = db.markets.insert_many(markets)
    print(f"Markets successfully seeded! Inserted IDs: {result.inserted_ids}")

if __name__ == "__main__":
    seed()
