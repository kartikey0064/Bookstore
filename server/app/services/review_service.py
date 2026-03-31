# ============================================================
#  REVIEW SERVICE
#  Users can submit ONE review per book and update it later.
#  The average book rating is updated via the ratings map in
#  book_service.set_user_rating (called separately from frontend).
# ============================================================

from datetime import datetime, timezone
from bson import ObjectId

from ..database.db_connection import get_db


def _serialize_review(doc):
    return {
        "id":        str(doc.get("_id")),
        "bookId":    str(doc.get("book_id")),
        "userEmail": doc.get("user_email", ""),
        "userName":  doc.get("user_name",  ""),
        "rating":    doc.get("rating",      0),
        "comment":   doc.get("comment",    ""),
        "createdAt": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updatedAt": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


def list_reviews(book_id):
    """List all reviews for a book, newest first."""
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db   = get_db()
    docs = db.reviews.find({"book_id": oid}).sort("created_at", -1)
    return [_serialize_review(doc) for doc in docs]


def create_review(book_id, payload):
    """
    Upsert a review: one review per user per book.
    If the user already reviewed this book, their review is updated.
    """
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    email   = (payload.get("email")   or "").strip().lower()
    name    = (payload.get("name")    or "").strip() or "Reader"
    comment = (payload.get("comment") or "").strip()
    rating  = payload.get("rating")

    if not email:
        raise ValueError("email is required")
    if not comment:
        raise ValueError("comment is required")

    try:
        rating_value = float(rating)
    except (TypeError, ValueError) as exc:
        raise ValueError("rating must be a number") from exc

    if not 1 <= rating_value <= 5:
        raise ValueError("rating must be between 1 and 5")

    db  = get_db()
    now = datetime.now(timezone.utc)

    # Check for existing review by this user for this book
    existing = db.reviews.find_one({"book_id": oid, "user_email": email})

    if existing:
        # Update existing review
        db.reviews.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "rating":     rating_value,
                "comment":    comment,
                "user_name":  name,
                "updated_at": now,
            }},
        )
        return _serialize_review(db.reviews.find_one({"_id": existing["_id"]}))
    else:
        # Insert new review
        doc = {
            "book_id":    oid,
            "user_email": email,
            "user_name":  name,
            "rating":     rating_value,
            "comment":    comment,
            "created_at": now,
            "updated_at": now,
        }
        result = db.reviews.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _serialize_review(doc)
