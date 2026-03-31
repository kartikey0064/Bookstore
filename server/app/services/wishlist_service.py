from datetime import datetime, timezone
from bson import ObjectId

from ..database.db_connection import get_db
from .book_service import _serialize_book


def _normalize_email(email):
    email_value = (email or "").strip().lower()
    if not email_value:
        raise ValueError("email is required")
    return email_value


def _coerce_book_ids(book_ids):
    object_ids = []
    for book_id in book_ids:
        try:
            object_ids.append(ObjectId(book_id))
        except Exception:
            continue
    return object_ids


def get_wishlist_books(email):
    email_value = _normalize_email(email)
    db = get_db()
    doc = db.wishlists.find_one({"user_email": email_value}) or {}
    ids = doc.get("items", [])
    if not ids:
        return {"email": email_value, "items": [], "ids": []}

    object_ids = _coerce_book_ids(ids)
    if not object_ids:
        return {"email": email_value, "items": [], "ids": []}

    docs = db.books.find({"_id": {"$in": object_ids}})
    by_id = {str(doc.get("_id")): _serialize_book(doc) for doc in docs}
    ordered_items = [by_id[book_id] for book_id in ids if book_id in by_id]
    return {"email": email_value, "items": ordered_items, "ids": ids}


def add_to_wishlist(email, book_id):
    email_value = _normalize_email(email)
    if not book_id:
        raise ValueError("bookId is required")

    db = get_db()
    db.wishlists.update_one(
        {"user_email": email_value},
        {
            "$addToSet": {"items": book_id},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
    return get_wishlist_books(email_value)


def remove_from_wishlist(email, book_id):
    email_value = _normalize_email(email)
    if not book_id:
        raise ValueError("bookId is required")

    db = get_db()
    db.wishlists.update_one(
        {"user_email": email_value},
        {
            "$pull": {"items": book_id},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return get_wishlist_books(email_value)
