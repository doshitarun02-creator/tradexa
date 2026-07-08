from flask import Blueprint, request, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    set_access_cookies,
    unset_jwt_cookies
)
import bcrypt
from bson import ObjectId
from datetime import datetime, timezone

from models.user import create_user, serialize_user
from models.audit import log_admin_action
from utils.permissions import ROLE_SUPER_ADMIN, ROLE_USER, get_permissions_for_role
from config import Config
from utils.limiter import limiter
from utils.response import api_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("3 per hour")
def register():
    db = current_app.db
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or not password:
        return api_response(False, {}, "name, email, and password are required", 400)
    if len(name) < 2:
        return api_response(False, {}, "Name must be at least 2 characters", 400)
    if "@" not in email or "." not in email:
        return api_response(False, {}, "Invalid email address", 400)
    if len(password) < 6:
        return api_response(False, {}, "Password must be at least 6 characters", 400)

    if db.users.find_one({"email": email}):
        return api_response(False, {}, "Email already registered", 409)

    role = ROLE_USER
    if email == Config.ADMIN_EMAIL.lower().strip():
        existing_super_admin = db.users.find_one({"role": ROLE_SUPER_ADMIN})
        if not existing_super_admin:
            role = ROLE_SUPER_ADMIN

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = create_user(name, email, password_hash, role)
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    if role == ROLE_SUPER_ADMIN:
        log_admin_action(
            db,
            actor_id=str(result.inserted_id),
            actor_role=role,
            action="seed_super_admin",
            target_type="user",
            target_id=str(result.inserted_id),
            after={"email": email, "role": role},
            metadata={"reason": "Initial super_admin seeded via ADMIN_EMAIL match on registration"},
            ip=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

    identity = str(result.inserted_id)
    additional_claims = {"email": email, "role": role}
    token = create_access_token(identity=identity, additional_claims=additional_claims)

    response, status = api_response(True, {"user": serialize_user(user_doc)}, "Registration successful", 201)
    set_access_cookies(response, token)
    return response, status


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    db = current_app.db
    body = request.get_json(silent=True) or {}

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return api_response(False, {}, "email and password are required", 400)

    user = db.users.find_one({"email": email})
    if not user:
        return api_response(False, {}, "Invalid credentials", 401)

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return api_response(False, {}, "Invalid credentials", 401)

    if user.get("status", "active") != "active":
        return api_response(False, {}, "This account has been suspended. Contact an administrator.", 403)

    identity = str(user["_id"])
    additional_claims = {"email": user["email"], "role": user.get("role", "user")}
    token = create_access_token(identity=identity, additional_claims=additional_claims)

    response, status = api_response(True, {"user": serialize_user(user)}, "Login successful")
    set_access_cookies(response, token)
    return response, status


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    response, status = api_response(True, {}, "Logged out")
    unset_jwt_cookies(response)
    return response, status


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    db = current_app.db
    user_id = get_jwt_identity()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return api_response(False, {}, "User not found", 404)

    return api_response(True, {"user": serialize_user(user)}, "User fetched")


@auth_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_me():
    db = current_app.db
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    if not name or len(name) < 2:
        return api_response(False, {}, "A valid name (min 2 chars) is required", 400)

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"name": name}})
    user = db.users.find_one({"_id": ObjectId(user_id)})

    return api_response(True, {"user": serialize_user(user)}, "Profile updated")


@auth_bp.route("/permissions", methods=["GET"])
@jwt_required()
def my_permissions():
    """
    Returns the caller's role and the full set of permission strings granted
    to that role. The frontend uses this once at login/app-load to drive
    show/hide logic for admin pages and actions.
    """
    claims = get_jwt()
    role = claims.get("role", "user")
    perms = sorted(get_permissions_for_role(role))

    return api_response(True, {"role": role, "permissions": perms}, "Permissions fetched")
