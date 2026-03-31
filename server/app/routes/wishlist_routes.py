from flask import Blueprint, jsonify, request

from ..services.wishlist_service import (
    get_wishlist_books,
    add_to_wishlist,
    remove_from_wishlist,
)

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.get("/api/wishlist")
def get_wishlist():
    email = request.args.get("email", "")
    return jsonify(get_wishlist_books(email)), 200


@wishlist_bp.post("/api/wishlist")
def add_wishlist():
    payload = request.get_json(silent=True) or {}
    wishlist = add_to_wishlist(payload.get("email"), payload.get("bookId"))
    return jsonify(wishlist), 200


@wishlist_bp.delete("/api/wishlist/<book_id>")
def remove_wishlist(book_id):
    email = request.args.get("email", "")
    wishlist = remove_from_wishlist(email, book_id)
    return jsonify(wishlist), 200
