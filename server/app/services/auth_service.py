import os
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from ..database.db_connection import get_db
from .jwt_service import generate_auth_token
from .otp_service import consume_email_verification


def _clean(value):
    return (value or "").strip()


def _load_google_auth():
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise ValueError("Google sign-in requires the server dependencies from 'requirements.txt'. Run 'pip install -r requirements.txt'.") from exc

    return google_requests, id_token


def _serialize_user(user):
    return {
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "dob": user.get("dob", ""),
        "profile_pic": user.get("profile_pic", ""),
        "google_id": user.get("google_id", ""),
        "auth_provider": user.get("auth_provider", "local"),
        "email_verified": user.get("email_verified", False),
    }


def _build_auth_response(user):
    payload = _serialize_user(user)
    payload["token"] = generate_auth_token(user)
    return payload


def _base_profile_fields():
    return {
        "phone": "",
        "address_line": "",
        "city": "",
        "postal_code": "",
        "country": "",
        "profile_pic": "",
        "google_id": "",
        "auth_provider": "local",
        "email_verified": False,
    }


def create_user(payload):
    email = _clean(payload.get("email")).lower()
    password = payload.get("password") or ""
    name = _clean(payload.get("name"))
    dob = _clean(payload.get("dob"))
    role = _clean(payload.get("role")).lower() or "user"

    if not email or not password:
        raise ValueError("email and password are required")
    if not name:
        raise ValueError("name is required")
    if not dob:
        raise ValueError("date of birth is required")
    if role not in ("user", "admin"):
        role = "user"

    db = get_db()
    if db.users.find_one({"email": email}):
        raise ValueError("email already registered")
    consume_email_verification(email)

    user_doc = {
        "email": email,
        "name": name,
        "dob": dob,
        "role": role,
        "password_hash": generate_password_hash(password),
        **_base_profile_fields(),
        "email_verified": True,
    }

    db.users.insert_one(user_doc)
    return _build_auth_response(user_doc)


def login_user(payload):
    email = _clean(payload.get("email")).lower()
    password = payload.get("password") or ""

    if not email or not password:
        raise ValueError("email and password are required")

    db = get_db()
    user = db.users.find_one({"email": email})

    if not user:
        raise ValueError("invalid email or password")

    if user.get("auth_provider") == "google" and not user.get("password_hash"):
        raise ValueError("this account uses Google sign-in. Continue with Google instead.")

    if not check_password_hash(user.get("password_hash", ""), password):
        raise ValueError("invalid email or password")

    return _build_auth_response(user)


def login_or_create_google_user(payload):
    credential = payload.get("credential") or ""
    client_id = payload.get("client_id") or None

    if not credential:
        raise ValueError("google credential is required")

    google_requests, id_token = _load_google_auth()

    google_client_id = client_id or _clean(os.getenv("GOOGLE_CLIENT_ID"))
    if not google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured on the server")

    try:
        token_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id,
        )
    except ValueError as exc:
        raise ValueError("invalid Google token") from exc

    if not token_info.get("email_verified"):
        raise ValueError("Google account email is not verified")

    google_id = token_info.get("sub")
    email = _clean(token_info.get("email")).lower()
    name = _clean(token_info.get("name")) or email.split("@")[0]
    profile_pic = _clean(token_info.get("picture"))

    if not google_id or not email:
        raise ValueError("Google account information is incomplete")

    db = get_db()
    user = db.users.find_one({"google_id": google_id}) or db.users.find_one({"email": email})
    now = datetime.now(timezone.utc).isoformat()

    if user:
        updates = {
            "google_id": google_id,
            "profile_pic": profile_pic,
            "auth_provider": "google",
            "last_google_login_at": now,
            "email_verified": True,
        }
        if not user.get("name"):
            updates["name"] = name
        if not user.get("email"):
            updates["email"] = email

        db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user.update(updates)
        return _build_auth_response(user)

    user_doc = {
        "email": email,
        "name": name,
        "dob": "",
        "role": "user",
        "password_hash": "",
        "profile_pic": profile_pic,
        "google_id": google_id,
        "auth_provider": "google",
        "email_verified": True,
        "created_at": now,
        "last_google_login_at": now,
        "phone": "",
        "address_line": "",
        "city": "",
        "postal_code": "",
        "country": "",
    }

    db.users.insert_one(user_doc)
    return _build_auth_response(user_doc)
