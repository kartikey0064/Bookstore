from flask import Blueprint, jsonify, request

from ..services.profile_service import get_profile, update_profile

profile_bp = Blueprint("profile", __name__)


@profile_bp.get("/api/profile")
def fetch_profile():
    email = request.args.get("email", "")
    return jsonify(get_profile(email)), 200


@profile_bp.put("/api/profile")
def save_profile():
    payload = request.get_json(silent=True) or {}
    profile = update_profile(payload)
    return jsonify(profile), 200
