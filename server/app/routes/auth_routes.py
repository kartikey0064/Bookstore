from flask import Blueprint, jsonify, request
from ..services.auth_service import create_admin_user, create_user, login_or_create_google_user, login_user
from ..services.jwt_service import decode_auth_token
from ..services.otp_service import send_signup_otp, verify_signup_otp

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/send-otp")
@auth_bp.post("/send-otp")
def send_otp():
    payload = request.get_json(silent=True) or {}
    result = send_signup_otp(payload)
    return jsonify(result), 200


@auth_bp.post("/api/auth/verify-otp")
@auth_bp.post("/verify-otp")
def verify_otp():
    payload = request.get_json(silent=True) or {}
    result = verify_signup_otp(payload)
    return jsonify(result), 200


@auth_bp.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    user = create_user(payload)
    return jsonify(user), 201


@auth_bp.post("/api/admin/users")
@auth_bp.post("/api/admin/create")
def create_admin():
    payload = request.get_json(silent=True) or {}
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        claims = decode_auth_token(auth_header[7:].strip())
        payload.setdefault("requesterEmail", claims.get("sub", ""))
    result = create_admin_user(payload)
    return jsonify(result), 201

@auth_bp.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    user = login_user(payload)
    return jsonify(user), 200


@auth_bp.post("/api/auth/google")
def google_login():
    payload = request.get_json(silent=True) or {}
    user = login_or_create_google_user(payload)
    return jsonify(user), 200
