from ..database.db_connection import get_db
from .book_service import _serialize_book


def _unique_books(docs):
    seen = set()
    ordered = []
    for doc in docs:
        book_id = str(doc.get("_id"))
        if book_id in seen:
            continue
        seen.add(book_id)
        ordered.append(_serialize_book(doc))
    return ordered


def get_recommendations(limit=6):
    db = get_db()
    trending_docs = list(db.books.find({"isBestseller": True}).sort("created_at", -1).limit(limit))
    if not trending_docs:
        trending_docs = list(db.books.find().sort("created_at", -1).limit(limit))

    top_rated_docs = list(db.books.find().sort("rating", -1).limit(limit))
    new_docs = list(db.books.find().sort("created_at", -1).limit(limit))

    return {
        "forYou": _unique_books(trending_docs[:3] + top_rated_docs[:3]),
        "trending": _unique_books(trending_docs),
        "topRated": _unique_books(top_rated_docs),
        "newArrivals": _unique_books(new_docs),
    }
