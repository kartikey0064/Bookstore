# ============================================================
#  BOOK SERVICE
#  Full CRUD for books: list, get by ID, create, update, delete.
#  Also handles per-user ratings and average calculation.
# ============================================================

from datetime import datetime, timezone
from bson import ObjectId

from ..database.db_connection import get_db


# ─── Serialiser ──────────────────────────────────────────────
def _serialize_book(doc):
    """Convert a MongoDB document to a JSON-safe dict."""
    return {
        "id":          str(doc.get("_id")),
        "title":       doc.get("title",        ""),
        "author":      doc.get("author",       ""),
        "description": doc.get("description",  ""),
        "price":       doc.get("price",         0),
        "rating":      doc.get("rating",        0),
        "ratings":     doc.get("ratings",      {}),   # { email: stars }
        "image":       doc.get("image",         ""),
        "category":    doc.get("category",      ""),
        "stock":       doc.get("stock",         0),
        "isNew":       doc.get("isNew",       False),
        "isBestseller":doc.get("isBestseller",False),
        "discount":    doc.get("discount",      0),
        "createdAt":   doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


# ─── List / Get ───────────────────────────────────────────────
def list_books():
    """Return all books sorted by creation date (newest first)."""
    db   = get_db()
    docs = db.books.find().sort("created_at", -1)
    return [_serialize_book(doc) for doc in docs]


def get_book(book_id):
    """Return a single book by its Mongo ObjectId string."""
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db  = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")
    return _serialize_book(doc)


# ─── Create ───────────────────────────────────────────────────
def create_book(payload):
    """Insert a new book document. Returns the created book."""
    title       = (payload.get("title")       or "").strip()
    author      = (payload.get("author")      or "").strip()
    category    = (payload.get("category")    or "").strip()
    description = (payload.get("description") or "").strip()
    image       = (payload.get("image")       or "").strip() or "https://via.placeholder.com/200x300"

    if not title or not author or not category:
        raise ValueError("title, author, and category are required")

    try:
        price = float(payload.get("price"))
    except (TypeError, ValueError):
        raise ValueError("price must be a number")

    # Optional numeric fields
    try:
        stock = int(payload.get("stock") or 0)
    except (TypeError, ValueError):
        stock = 0

    rating_value, discount_value = 0, 0

    if payload.get("rating") not in (None, ""):
        try:
            rating_value = float(payload["rating"])
        except (TypeError, ValueError):
            raise ValueError("rating must be a number")
        if not 0 <= rating_value <= 5:
            raise ValueError("rating must be between 0 and 5")

    if payload.get("discount") not in (None, ""):
        try:
            discount_value = int(payload["discount"])
        except (TypeError, ValueError):
            raise ValueError("discount must be a number")
        if not 0 <= discount_value <= 100:
            raise ValueError("discount must be between 0 and 100")

    book_doc = {
        "title":       title,
        "author":      author,
        "description": description,
        "price":       price,
        "rating":      rating_value,
        "ratings":     {},         # per-user rating map
        "image":       image,
        "category":    category,
        "stock":       stock,
        "isNew":       bool(payload.get("isNew")),
        "isBestseller":bool(payload.get("isBestseller")),
        "discount":    discount_value,
        "created_at":  datetime.now(timezone.utc),
    }

    db     = get_db()
    result = db.books.insert_one(book_doc)
    book_doc["_id"] = result.inserted_id
    return _serialize_book(book_doc)


# ─── Update ───────────────────────────────────────────────────
def update_book(book_id, payload):
    """Partial update of a book. Only provided fields are changed."""
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db  = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")

    # Build $set dict from whichever fields were sent
    updates = {}
    for field in ("title", "author", "category", "description", "image"):
        if field in payload and payload[field] is not None:
            updates[field] = str(payload[field]).strip()

    if "price" in payload and payload["price"] is not None:
        try:
            updates["price"] = float(payload["price"])
        except (TypeError, ValueError):
            raise ValueError("price must be a number")

    if "stock" in payload and payload["stock"] is not None:
        try:
            updates["stock"] = int(payload["stock"])
        except (TypeError, ValueError):
            raise ValueError("stock must be an integer")

    if "discount" in payload and payload["discount"] is not None:
        try:
            v = int(payload["discount"])
        except (TypeError, ValueError):
            raise ValueError("discount must be a number")
        if not 0 <= v <= 100:
            raise ValueError("discount must be 0-100")
        updates["discount"] = v

    for flag in ("isNew", "isBestseller"):
        if flag in payload:
            updates[flag] = bool(payload[flag])

    if updates:
        db.books.update_one({"_id": oid}, {"$set": updates})

    return _serialize_book(db.books.find_one({"_id": oid}))


# ─── Delete ───────────────────────────────────────────────────
def delete_book(book_id):
    """Remove a book by ID. Returns success message."""
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db     = get_db()
    result = db.books.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise ValueError("book not found")
    return {"message": "deleted"}


# ─── Ratings ──────────────────────────────────────────────────
def set_user_rating(book_id, payload):
    """
    Save or update a star rating from a logged-in user.
    Each user can rate once; subsequent calls update their rating.
    The book's aggregate `rating` field is recalculated automatically.
    """
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise ValueError("email is required")

    try:
        stars = float(payload.get("stars") or payload.get("rating", 0))
    except (TypeError, ValueError):
        raise ValueError("stars must be a number")

    if not 1 <= stars <= 5:
        raise ValueError("rating must be between 1 and 5")

    db  = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")

    # Update the per-user map
    ratings_map = doc.get("ratings", {}) or {}
    ratings_map[email] = stars

    # Recalculate average
    values = list(ratings_map.values())
    avg    = round(sum(values) / len(values), 2) if values else 0

    db.books.update_one(
        {"_id": oid},
        {"$set": {"ratings": ratings_map, "rating": avg}},
    )

    return _serialize_book(db.books.find_one({"_id": oid}))


# ─── Search ───────────────────────────────────────────────────
def search_books(query, by="all"):
    """
    Full-text style search on name / author / id.
    `by` can be 'name', 'author', 'id', or 'all'.
    """
    db = get_db()

    # Search by ID
    if by == "id":
        try:
            doc = db.books.find_one({"_id": ObjectId(query)})
            return [_serialize_book(doc)] if doc else []
        except Exception:
            return []

    # Build regex filter
    import re
    pattern = re.compile(re.escape(query), re.IGNORECASE)

    if by == "name":
        filt = {"title": pattern}
    elif by == "author":
        filt = {"author": pattern}
    else:  # all
        filt = {"$or": [{"title": pattern}, {"author": pattern}, {"category": pattern}]}

    docs = db.books.find(filt).sort("created_at", -1)
    return [_serialize_book(doc) for doc in docs]


# ─── Revenue helper ───────────────────────────────────────────
def total_revenue():
    """Sum of (price × quantity) across all confirmed orders."""
    db     = get_db()
    result = db.orders.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    for doc in result:
        return round(doc.get("total", 0), 2)
    return 0.0
