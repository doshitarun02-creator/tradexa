# TradeXa Product Rules — Points System

## 1. Core Model
TradeXa is a points-based prediction market platform. Points are a
non-monetary in-app unit — they are not directly purchasable online.
Real cash is collected manually/offline by the platform operator, and an
equal number of points is credited to the user's account by a super_admin.

## 2. Roles

### super_admin
Has unrestricted control over the platform:
- Create, edit, pause, settle, and cancel prediction markets
- Credit or debit any user's points balance (after receiving offline cash)
- Ban/unban (suspend/reactivate) user accounts
- Approve or reject redeem/payout requests
- View all users, all trades, the full points ledger, and the admin audit log

### user
Standard end-user, restricted to:
- Sign up / log in
- Check points balance
- Browse markets
- Place bets (trades) using points
- View trade history and portfolio
- View and edit own profile
- Submit a redeem/payout request (does not self-approve)

There is no third role. Legacy roles from earlier phases (`ops_admin`,
`market_admin`, `risk_admin`) have been retired — any user previously
assigned one of those roles must be migrated to `super_admin`.

## 3. Cash-to-Points Workflow

1. User contacts the platform operator offline (in person, phone, or
   messaging) and hands over cash.
2. A super_admin logs into the admin panel and credits the equivalent
   number of points to that user's account via the points adjustment
   endpoint, entering a mandatory reason (e.g. "Cash received ₹5000 on
   13-Jul via UPI, ref #1234").
3. Every credit/debit is written to an immutable points ledger entry
   (`type: admin_credit` or `admin_debit`) recording actor, reason, and
   before/after balances.
4. There is no online payment gateway, no user-initiated deposit flow,
   and no direct bank/UPI integration for adding points.

## 4. Redeem / Payout Workflow

1. A user with a sufficient points balance submits a redeem request
   specifying the number of points and payout method (bank transfer/UPI)
   plus payout details.
2. Only one pending redeem request per user is allowed at a time.
3. A super_admin reviews the request:
   - **Approve**: points are atomically deducted from the user's balance,
     a `redemption_debit` ledger entry is recorded, and the operator pays
     out the equivalent cash to the user offline.
   - **Reject**: the request is marked rejected with an optional note; no
     points are deducted.
4. Users can never withdraw points to cash themselves — every redemption
   requires super_admin approval.

## 5. What Was Removed From the Old Model

- User-facing "Deposit" flow (online money-in) — removed entirely.
  Points only enter the system via super_admin credit.
- User-facing "Withdraw" flow with bank account/UPI self-service — replaced
  by the redeem-request-and-approval flow above.
- Sports market categories (Cricket, Football, Kabaddi, etc.) — the
  platform is finance-only (Crypto, Forex, Macro, Stocks, Commodities).
- Multi-tier admin roles (ops_admin, market_admin, risk_admin) — collapsed
  into a single super_admin role.

## 6. Terminology Map

| Old Term | New Term |
|---|---|
| Wallet / Wallet Balance | Points Wallet / Points Balance |
| Available Balance | Available Points |
| Deposit | Admin Credit (cash received offline) |
| Withdraw | Redeem Request / Payout Request |
| Total Deposits | Total Points Added |
| Total Withdrawals | Total Points Redeemed |
| Trade Won / Trade Lost | Points Won / Points Lost |
| ₹ (currency symbol) | pts (points unit) |
