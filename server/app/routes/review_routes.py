from flask import Blueprint, jsonify, request

from ..services.review_service import list_reviews, create_review

review_bp = Blueprint("reviews", __name__)


@review_bp.get("/api/books/<book_id>/reviews")
def get_reviews(book_id):
    return jsonify(list_reviews(book_id)), 200


@review_bp.post("/api/books/<book_id>/reviews")
def add_review(book_id):
    payload = request.get_json(silent=True) or {}
    review = create_review(book_id, payload)
    return jsonify(review), 201
