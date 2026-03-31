# ============================================================
#  BOOK ROUTES
#  NOTE: Static paths (/search, /admin/revenue) are defined
#  BEFORE variable paths (/<book_id>) so Flask matches them first.
#
#  GET    /api/books             – list all books
#  GET    /api/books/search      – search (q=, by=)
#  GET    /api/admin/revenue     – total revenue (admin)
#  GET    /api/books/<id>        – get single book
#  POST   /api/books             – create book (admin)
#  PUT    /api/books/<id>        – update book (admin)
#  DELETE /api/books/<id>        – delete book (admin)
#  POST   /api/books/<id>/rate   – submit / update a user rating
# ============================================================

from flask import Blueprint, jsonify, request
from ..services.book_service import (
    list_books, get_book, create_book, update_book,
    delete_book, set_user_rating, search_books, total_revenue,
)

book_bp = Blueprint("books", __name__)


# ── 1. Static paths first ─────────────────────────────────────

@book_bp.get("/api/books")
def get_books():
    """Return all books, newest first."""
    return jsonify(list_books()), 200


@book_bp.get("/api/books/search")
def search():
    """
    Search books by title / author / id.
    Query params: q (query string), by (name|author|id|all)
    """
    query = request.args.get("q", "").strip()
    by    = request.args.get("by", "all")
    if not query:
        return jsonify([]), 200
    return jsonify(search_books(query, by)), 200


@book_bp.get("/api/admin/revenue")
def get_revenue():
    """Return total revenue across all orders (admin only)."""
    return jsonify({"totalRevenue": total_revenue()}), 200


# ── 2. Variable paths after static ───────────────────────────

@book_bp.get("/api/books/<book_id>")
def get_book_by_id(book_id):
    return jsonify(get_book(book_id)), 200


@book_bp.post("/api/books")
def add_book():
    payload = request.get_json(silent=True) or {}
    book    = create_book(payload)
    return jsonify(book), 201


@book_bp.put("/api/books/<book_id>")
def edit_book(book_id):
    payload = request.get_json(silent=True) or {}
    book    = update_book(book_id, payload)
    return jsonify(book), 200


@book_bp.delete("/api/books/<book_id>")
def remove_book(book_id):
    result = delete_book(book_id)
    return jsonify(result), 200


@book_bp.post("/api/books/<book_id>/rate")
def rate_book(book_id):
    """Save / update a star rating for the logged-in user."""
    payload = request.get_json(silent=True) or {}
    book    = set_user_rating(book_id, payload)
    return jsonify(book), 200
