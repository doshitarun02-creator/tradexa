from flask import Blueprint, request, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
import bcrypt
from bson import ObjectId
from datetime import datetime, timezone

from models.user import create_user, serialize_user
from config import Config

auth_bp = Blueprint("auth", __name__)


def _resp(success: bool, data: dict, message: str, status: int = 200):
    return {"success": success, "data": data, "message": message}, status


@auth_bp.route("/register", methods=["POST"])
def register():
    db = current_app.db
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or not password:
        return _resp(False, {}, "name, email, and password are required", 400)
    if len(name) < 2:
        return _resp(False, {}, "Name must be at least 2 characters", 400)
    if "@" not in email or "." not in email:
        return _resp(False, {}, "Invalid email address", 400)
    if len(password) < 6:
        return _resp(False, {}, "Password must be at least 6 characters", 400)

    if db.users.find_one({"email": email}):
        return _resp(False, {}, "Email already registered", 409)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    role = "admin" if email == Config.ADMIN_EMAIL.lower().strip() else "user"

    user_doc = create_user(name, email, password_hash, role)
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    identity = str(result.inserted_id)
    additional_claims = {"email": email, "role": role}
    token = create_access_token(identity=identity, additional_claims=additional_claims)

    return _resp(True, {"token": token, "user": serialize_user(user_doc)}, "Registration successful", 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    db = current_app.db
    body = request.get_json(silent=True) or {}

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return _resp(False, {}, "email and password are required", 400)

    user = db.users.find_one({"email": email})
    if not user:
        return _resp(False, {}, "Invalid email or password", 401)

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return _resp(False, {}, "Invalid email or password", 401)

    identity = str(user["_id"])
    additional_claims = {"email": user["email"], "role": user.get("role", "user")}
    token = create_access_token(identity=identity, additional_claims=additional_claims)

    return _resp(True, {"token": token, "user": serialize_user(user)}, "Login successful")


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    db = current_app.db
    user_id = get_jwt_identity()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return _resp(False, {}, "User not found", 404)

    return _resp(True, {"user": serialize_user(user)}, "User fetched")


@auth_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_me():
    db = current_app.db
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    if not name or len(name) < 2:
        return _resp(False, {}, "A valid name (min 2 chars) is required", 400)

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"name": name}})
    user = db.users.find_one({"_id": ObjectId(user_id)})

    return _resp(True, {"user": serialize_user(user)}, "Profile updated")
