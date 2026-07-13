# TradeXa — Admin Operations Guide

## Who is a Super Admin
The single `super_admin` role holds every administrative capability. There
are no other admin tiers. The first account registered with the email
matching `Config.ADMIN_EMAIL` is auto-promoted to `super_admin` on
registration (see `routes/auth.py::register`).

## Sensitive Actions & Audit Logging
Every action below writes an immutable entry to `admin_audit_log` via
`log_admin_action()`, capturing actor, role, before/after state, metadata,
IP, and user agent:

| Action | Endpoint | Logged As |
|---|---|---|
| Credit/debit points | `POST /admin/users/:id/points` | `points_adjust` |
| Suspend/reactivate user | `PATCH /admin/users/:id/status` | `user_status_change` |
| Change user role | `PATCH /admin/users/:id/role` | `role_change` |
| Publish market (draft→upcoming) | `POST /admin/markets/:id/publish` | `market_publish` |
| Pause market | `POST /admin/markets/:id/pause` | `market_pause` |
| Resume market | `POST /admin/markets/:id/resume` | `market_resume` |
| Cancel market | `POST /admin/markets/:id/cancel` | `market_cancel` |
| Settle market | `POST /admin/markets/:id/settle` | `market_settle` |
| Approve redeem request | `POST /admin/redemptions/:id/approve` | `redemption_approve` |
| Reject redeem request | `POST /admin/redemptions/:id/reject` | `redemption_reject` |
| Complete redeem request | `POST /admin/redemptions/:id/complete` | `redemption_completed` / `redemption_failed` |

## Point Adjustments & Ledger Integrity
All points ledger mutations must go through the unified `debit_points` and `credit_points` services. Administrative manual points adjustments are logged with the type `admin_credit` or `admin_debit`, preserving the transaction trail.
