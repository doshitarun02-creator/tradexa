"""
Role-based permission system for TradeXa.

Roles form a flat set (no inheritance) — each role is granted an explicit
list of permission strings. This keeps authorization auditable: to know what
a role can do, read ROLE_PERMISSIONS[role] directly, no hidden inheritance
chains to trace.

To add a new permission:
1. Add the permission string to PERMISSIONS (documentation/registry).
2. Grant it to the appropriate role(s) in ROLE_PERMISSIONS.
3. Decorate the route with @require_permission("the:permission").

See ROLE_PERMISSION_MATRIX.md at the repo root for the human-readable matrix.
"""
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt

# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------
ROLE_SUPER_ADMIN = "super_admin"
ROLE_OPS_ADMIN = "ops_admin"
ROLE_MARKET_ADMIN = "market_admin"
ROLE_RISK_ADMIN = "risk_admin"
ROLE_USER = "user"

ALL_ROLES = [
    ROLE_SUPER_ADMIN,
    ROLE_OPS_ADMIN,
    ROLE_MARKET_ADMIN,
    ROLE_RISK_ADMIN,
    ROLE_USER,
]

ADMIN_ROLES = [ROLE_SUPER_ADMIN, ROLE_OPS_ADMIN, ROLE_MARKET_ADMIN, ROLE_RISK_ADMIN]

# ---------------------------------------------------------------------------
# Permission registry (documentation of every permission string in use)
# ---------------------------------------------------------------------------
PERMISSIONS = {
    "markets:create": "Create new prediction markets",
    "markets:update": "Edit existing (non-settled) markets",
    "markets:delete": "Delete non-live markets",
    "markets:settle": "Settle a market and trigger payouts",
    "markets:templates:view": "View market creation templates",
    "users:view": "View the platform user list",
    "users:suspend": "Suspend/reactivate a user account",
    "wallet:adjust": "Manually credit/debit a user's wallet",
    "stats:view": "View platform-wide statistics",
    "audit:view": "View the admin audit log",
    "roles:manage": "Change another user's role",
}

# ---------------------------------------------------------------------------
# Role -> permission grants
# ---------------------------------------------------------------------------
ROLE_PERMISSIONS = {
    ROLE_SUPER_ADMIN: set(PERMISSIONS.keys()),  # full access, including roles:manage
    ROLE_OPS_ADMIN: {
        "users:view",
        "users:suspend",
        "wallet:adjust",
        "stats:view",
        "audit:view",
    },
    ROLE_MARKET_ADMIN: {
        "markets:create",
        "markets:update",
        "markets:delete",
        "markets:templates:view",
        "stats:view",
    },
    ROLE_RISK_ADMIN: {
        "markets:settle",
        "stats:view",
        "audit:view",
    },
    ROLE_USER: set(),
}


def get_permissions_for_role(role: str) -> set:
    return ROLE_PERMISSIONS.get(role, set())


def role_has_permission(role: str, permission: str) -> bool:
    return permission in get_permissions_for_role(role)


def _forbidden(message: str):
    return jsonify({"success": False, "data": {}, "message": message}), 403


def require_permission(permission: str):
    """
    Route decorator: requires a valid JWT AND that the caller's role
    (from the JWT's 'role' claim) is granted `permission`.

    Usage:
        @admin_bp.route("/admin/markets/<id>/settle", methods=["POST"])
        @require_permission("markets:settle")
        def settle(id): ...
    """
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
    """
    Route decorator: requires a valid JWT AND that the caller's role is any
    admin role (i.e. not the plain 'user' role). Use this for endpoints that
    are shared across admin roles but don't map to a single fine-grained
    permission (e.g. a generic "am I any kind of admin" gate).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role", ROLE_USER)
            if role not in ADMIN_ROLES:
                return _forbidden("Admin access required.")
            return fn(*args, **kwargs)
        return wrapper
    return decorator
