from flask import Blueprint, jsonify

from ..services.recommendation_service import get_recommendations

recommendation_bp = Blueprint("recommendations", __name__)


@recommendation_bp.get("/api/recommendations")
def fetch_recommendations():
    return jsonify(get_recommendations()), 200
