from flask import Blueprint, jsonify, request
from ..services.auth_service import create_user, login_or_create_google_user, login_user
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
