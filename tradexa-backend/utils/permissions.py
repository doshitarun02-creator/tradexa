"""
Role-based permission system for TradeXa — Points Model.

TradeXa now runs a two-role system:
  - super_admin: full control over markets, points ledger, redemptions, users
  - user: end-user, no admin powers of any kind

Previous granular admin roles (ops_admin, market_admin, risk_admin) have been
collapsed into super_admin per the points-based business model. Any user
document with one of those legacy role strings must be migrated to
"super_admin" manually before this change goes live in production.

To add a new permission:
1. Add the permission string to PERMISSIONS (documentation/registry).
2. Grant it to super_admin in ROLE_PERMISSIONS (user always gets none).
3. Decorate the route with @require_permission("the:permission").
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------
ROLE_SUPER_ADMIN = "super_admin"
ROLE_USER = "user"

ALL_ROLES = [ROLE_SUPER_ADMIN, ROLE_USER]
ADMIN_ROLES = [ROLE_SUPER_ADMIN]

# ---------------------------------------------------------------------------
# Permission registry
# ---------------------------------------------------------------------------
PERMISSIONS = {
    "markets:create": "Create new prediction markets",
    "markets:update": "Edit existing (non-settled) markets",
    "markets:delete": "Delete non-live markets",
    "markets:pause": "Pause/resume a live market",
    "markets:settle": "Settle a market and trigger payouts",
    "markets:templates:view": "View market creation templates",
    "users:view": "View the platform user list",
    "users:suspend": "Suspend/reactivate (ban/unban) a user account",
    "points:adjust": "Manually credit/debit a user's points balance",
    "redemptions:view": "View redeem/payout requests",
    "redemptions:approve": "Approve a redeem/payout request",
    "redemptions:reject": "Reject a redeem/payout request",
    "stats:view": "View platform-wide statistics",
    "audit:view": "View the admin audit log",
    "roles:manage": "Change another user's role",
}

# ---------------------------------------------------------------------------
# Role -> permission grants
# ---------------------------------------------------------------------------
ROLE_PERMISSIONS = {
    ROLE_SUPER_ADMIN: set(PERMISSIONS.keys()),
    ROLE_USER: set(),
}


def get_permissions_for_role(role: str) -> set:
    return ROLE_PERMISSIONS.get(role, set())


def role_has_permission(role: str, permission: str) -> bool:
    return permission in get_permissions_for_role(role)


def _forbidden(message: str):
    return jsonify({"success": False, "data": {}, "message": message}), 403


def require_permission(permission: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role", ROLE_USER)
            if not role_has_permission(role, permission):
                return _forbidden(
                    f"Your role ('{role}') does not have the '{permission}' permission."
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_any_admin_role():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role", ROLE_USER)
            if role not in ADMIN_ROLES:
                return _forbidden("Super admin access required.")
            return fn(*args, **kwargs)
        return wrapper
    return decorator
