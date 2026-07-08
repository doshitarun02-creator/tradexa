"""
One-time CLI script to seed (or promote) a super_admin account.

This is intentionally NOT an HTTP endpoint — creating the first super_admin
must happen out-of-band (direct DB access), never through a publicly
reachable route, to prevent registration-time privilege escalation.

Usage (from tradexa-backend/):
    python scripts/seed_admin.py

You will be prompted for name, email, and password. If a user with that
email already exists, the script will offer to promote them to super_admin
instead of creating a duplicate account.
"""
import sys
import os
import getpass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from pymongo import MongoClient
from config import Config
from models.user import create_user, serialize_user
from utils.permissions import ROLE_SUPER_ADMIN


def main():
    print("=== TradeXa Super Admin Seeder ===")
    client = MongoClient(Config.MONGO_URI)
    db = client.get_default_database()

    email = input("Admin email: ").strip().lower()
    if not email or "@" not in email:
        print("Invalid email. Aborting.")
        sys.exit(1)

    existing = db.users.find_one({"email": email})
    if existing:
        if existing.get("role") == ROLE_SUPER_ADMIN:
            print(f"User {email} is already a super_admin. Nothing to do.")
            sys.exit(0)
        confirm = input(
            f"User {email} already exists with role '{existing.get('role')}'. "
            f"Promote to super_admin? [y/N]: "
        ).strip().lower()
        if confirm != "y":
            print("Aborted.")
            sys.exit(0)
        db.users.update_one({"_id": existing["_id"]}, {"$set": {"role": ROLE_SUPER_ADMIN}})
        print(f"Promoted {email} to super_admin.")
        sys.exit(0)

    name = input("Admin name: ").strip()
    if not name or len(name) < 2:
        print("Invalid name. Aborting.")
        sys.exit(1)

    password = getpass.getpass("Admin password (min 6 chars): ")
    if not password or len(password) < 6:
        print("Password too short. Aborting.")
        sys.exit(1)
    confirm_password = getpass.getpass("Confirm password: ")
    if password != confirm_password:
        print("Passwords do not match. Aborting.")
        sys.exit(1)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = create_user(name, email, password_hash, role=ROLE_SUPER_ADMIN)
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    print(f"Created super_admin: {email} (id={result.inserted_id})")
    print("Done. This account can now log in and manage other admin roles via /admin/users/<id>/role.")


if __name__ == "__main__":
    main()
