<!--
GitHub metadata (do not remove):
Description: Finance-only opinion trading platform for Forex, Crypto & Macro markets
Topics: opinion-trading, prediction-market, forex, crypto, fintech, flask, react, mongodb, vite, trading-app, india, lmsr
-->

# TradeXa

![Flask](https://img.shields.io/badge/Backend-Flask-%23000?logo=flask&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React-%2361DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-%2347A248?logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Hosting-Vercel-%23000000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

**Trade your market intelligence.**

TradeXa is a finance‑only opinion trading platform where users buy YES/NO shares on questions about Forex, Crypto, Macro, Stocks, and Commodities. Prices are set by an LMSR automated market maker and winners receive a fixed payout per share when markets settle.

---

## Features

- Finance‑only YES/NO prediction markets (Crypto, Forex, Macro, Stocks, Commodities).
- Logarithmic Market Scoring Rule (LMSR) pricing with YES + NO always summing to 10.
- Wallet‑based trading with P&L tracking, win‑rate stats, and open vs settled positions.
- Real‑time price widgets and tickers powered by CoinGecko and fawazahmed0 currency API.
- Curated news feed via Marketaux with sentiment tagging and cache layers.
- Admin console for creating, templating, and settling markets plus user wallet controls.
- Responsive dark terminal UI built with Vite + React + Tailwind and animated with Framer Motion.

---

## Architecture

```mermaid
flowchart LR
  subgraph Client [Frontend (Vercel)]
    A[React + Vite SPA<br/>Tailwind / Framer Motion]
    A -->|Axios| B[/HTTP API/]
  end

  subgraph Server [Backend (Render)]
    B --> C[Flask API<br/>JWT Auth]
    C --> D[MongoDB Atlas]
    C --> E[LMSR Pricing Engine]
    C --> F[Price Feed Service<br/>CoinGecko + Currency API]
    C --> G[News Feed Service<br/>Marketaux]
  end

  D <--> E
  C -->|Admin routes| H[Admin Console UI]
```

---

## How LMSR Pricing Works

TradeXa uses the Logarithmic Market Scoring Rule (LMSR) to price YES and NO shares. An LMSR market keeps a running record of outstanding YES and NO shares, and computes prices from a cost function rather than an order book.

- Let \( q_{\text{yes}} \) and \( q_{\text{no}} \) be the current outstanding shares of YES and NO.
- Let \( b \) be the liquidity parameter (higher \( b \) = deeper, smoother market).
- The cost function is \( C(q) = b \cdot \ln(e^{q_{\text{yes}}/b} + e^{q_{\text{no}}/b}) \).
- To buy more shares, the trader pays the increase in cost:
  - \( \text{cost} = C(q_{\text{new}}) - C(q_{\text{old}}) \).
- The instantaneous price of YES is:
  - \( p_{\text{yes}} = \dfrac{e^{q_{\text{yes}}/b}}{e^{q_{\text{yes}}/b} + e^{q_{\text{no}}/b}} \).
- TradeXa scales this probability so that YES + NO always equals 10:
  - YES price = \( 10 \cdot p_{\text{yes}} \)
  - NO price  = \( 10 - \text{YES price} \)

**Example**

- Start: no shares, so YES = 5.0 and NO = 5.0.
- A user buys 10 YES shares. The cost is \( C(q_{\text{yes}}+10, q_{\text{no}}) - C(q_{\text{yes}}, q_{\text{no}}) \); average price might come out near 6.2 per share depending on \( b \).
- After this, YES might move to 6.2 and NO to 3.8.
- If YES wins on settlement, each YES share pays 10, so profit per share is \( 10 - \text{buy price} \). If NO wins, the amount spent is fully lost.

This design guarantees continuous liquidity and bounded loss for the market maker.

---

## Tech Stack

| Layer       | Technology                                                                 |
|------------|-----------------------------------------------------------------------------|
| Backend    | Flask, Flask‑JWT‑Extended, Flask‑CORS, Gunicorn                            |
| Database   | MongoDB Atlas (users, markets, trades, cached feeds)                       |
| Frontend   | Vite + React, React Router, Tailwind CSS, Framer Motion, Lucide React      |
| Auth       | JWT access tokens (7‑day expiry), bcrypt password hashing                  |
| External   | CoinGecko (crypto prices), fawazahmed0 currency API, Marketaux (news)      |
| Deploy     | Render (backend web service), Vercel (static SPA frontend)                 |

---

## Local Setup

### 1. Backend (Flask + MongoDB)

Requirements:
- Python 3.10+
- MongoDB instance or MongoDB Atlas URI

```bash
# From repo root
cd tradexa-backend

# Create virtualenv (optional but recommended)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env template
cp .env.example .env
# Edit .env to set MONGO_URI, JWT_SECRET_KEY, ADMIN_EMAIL, MARKETAUX_API_KEY, FRONTEND_URL

# Run development server
export FLASK_ENV=development
python app.py
# API will be available on http://localhost:5000
```

### 2. Frontend (Vite + React)

Requirements:
- Node.js 18+

```bash
# From repo root
cd tradexa-frontend

# Install dependencies
npm install

# Configure API base URL for local dev
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000

# Start dev server
npm run dev
# App will be available on http://localhost:5173
```

Vite dev server proxies directly to the Flask API via the configured base URL, and JWT tokens are managed in `sessionStorage` by the `AuthContext`.

---

## API Reference

All responses follow the envelope:

```json
{
  "success": true,
  "data": { },
  "message": "Human readable message"
}
```

### Auth

| Method | Path              | Description                            | Auth   |
|--------|-------------------|----------------------------------------|--------|
| POST   | `/api/auth/register` | Register user, auto‑login, returns JWT & user | Public |
| POST   | `/api/auth/login`    | Login with email/password             | Public |
| GET    | `/api/auth/me`       | Get current user profile              | JWT    |
| PATCH  | `/api/auth/me`       | Update user name                      | JWT    |

### Markets (Public + Admin)

| Method | Path                         | Description                                      | Auth       |
|--------|------------------------------|--------------------------------------------------|------------|
| GET    | `/api/markets`               | List markets (filter by `category`, `status`)    | Public     |
| GET    | `/api/markets/:id`          | Get single market by id                          | Public     |
| POST   | `/api/admin/markets`        | Create new market                                | Admin JWT  |
| PATCH  | `/api/admin/markets/:id`    | Update market (question, category, status, etc.) | Admin JWT  |
| DELETE | `/api/admin/markets/:id`    | Delete market (not live, no trades)              | Admin JWT  |

### Trades & Portfolio

| Method | Path                    | Description                                                   | Auth  |
|--------|-------------------------|---------------------------------------------------------------|-------|
| POST   | `/api/trades`          | Place trade (YES/NO, quantity) on a live market              | JWT   |
| GET    | `/api/my-trades`       | List user trades (filters: `status=open/settled`, paginated) | JWT   |
| GET    | `/api/trades/portfolio`| Portfolio summary (wallet, P&L, open positions)              | JWT   |
| GET    | `/api/trades/leaderboard` | Leaderboard (top users by wallet/win‑rate, `period` param)  | Public |

### Prices & News

| Method | Path          | Description                                                | Auth  |
|--------|---------------|------------------------------------------------------------|-------|
| GET    | `/api/prices` | Cached crypto + FX prices (CoinGecko + currency API)      | Public |
| GET    | `/api/news`   | Cached Marketaux news articles with derived sentiment      | Public |

### Admin

| Method | Path                                   | Description                                  | Auth      |
|--------|----------------------------------------|----------------------------------------------|-----------|
| POST   | `/api/admin/markets/:id/settle`       | Settle market with winning side YES/NO       | Admin JWT |
| GET    | `/api/admin/stats`                    | Platform stats (users, markets, trades, volume) | Admin JWT |
| GET    | `/api/admin/users`                    | Paginated list of users                      | Admin JWT |
| PATCH  | `/api/admin/users/:id/wallet`         | Adjust user wallet (set/add/subtract)        | Admin JWT |
| GET    | `/api/admin/market-templates`         | 25+ pre‑built market templates               | Admin JWT |

---

## Deployment Guide

### Backend on Render

1. **Create Web Service**
   - Connect GitHub repo in Render dashboard.
   - New → Web Service → select this repo.
   - Root directory: `tradexa-backend`.
   - Environment: Python 3.
   - Build command: `pip install -r requirements.txt`.
   - Start command: `gunicorn app:app`.

2. **Environment Variables**
   - Set `MONGO_URI` to your MongoDB Atlas connection string.
   - Set `JWT_SECRET_KEY` to a long random value.
   - Set `ADMIN_EMAIL` for the admin account.
   - Set `MARKETAUX_API_KEY` from Marketaux dashboard.
   - Set `FRONTEND_URL` to the Vercel production URL (e.g. `https://tradexa.vercel.app`).
   - Set `FLASK_ENV=production`.

3. **CORS**
   - In production, CORS origins are restricted to `FRONTEND_URL` via `Config.cors_origins()` and Flask‑CORS usage.

4. **Deploy**
   - Click "Create Web Service".
   - Render will build and run `gunicorn app:app`.
   - Note the public API base URL, e.g. `https://tradexa-backend.onrender.com`.

### Frontend on Vercel

1. **Create Project**
   - Import the repo on Vercel.
   - Root Directory: `tradexa-frontend`.
   - Build Command: `npm run build`.
   - Output Directory: `dist` (configured in `vite.config.js`).

2. **Environment Variable**
   - Set `VITE_API_BASE_URL` to the Render backend URL, e.g. `https://tradexa-backend.onrender.com`.

3. **SPA Routing**
   - `vercel.json` includes a rewrite to `index.html` for all non‑API routes so React Router works on refresh.

4. **Deploy**
   - Push to `main` (or configured branch); Vercel builds and deploys automatically.

---

## Roadmap

Planned enhancements:
- WebSocket or SSE streaming for live price updates and trade fills.
- Native UPI‑backed wallet for deposits/withdrawals in India.
- Mobile apps (React Native) with shared LMSR backend.
- Social trading features: follow traders, public profiles, and shared market lists.
- Advanced analytics: distribution of beliefs, market impact, and trader cohorts.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
