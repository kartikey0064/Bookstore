from datetime import datetime, timezone
import re

from bson import ObjectId

from ..database.db_connection import get_db


SAMPLE_BOOKS = [
    {
        "seed_key": "atomic-habits",
        "title": "Atomic Habits",
        "author": "James Clear",
        "description": "Practical strategies for building good habits and breaking bad ones.",
        "price": 499,
        "image": "https://via.placeholder.com/200x300/1f2937/f8fafc?text=Atomic+Habits",
        "category": "Self Help",
        "stock": 18,
        "isNew": True,
        "isBestseller": True,
        "discount": 10,
    },
    {
        "seed_key": "deep-work",
        "title": "Deep Work",
        "author": "Cal Newport",
        "description": "A guide to focused success in a distracted world.",
        "price": 459,
        "image": "https://via.placeholder.com/200x300/0f172a/f8fafc?text=Deep+Work",
        "category": "Productivity",
        "stock": 12,
        "isNew": False,
        "isBestseller": True,
        "discount": 8,
    },
    {
        "seed_key": "the-alchemist",
        "title": "The Alchemist",
        "author": "Paulo Coelho",
        "description": "A timeless novel about destiny, purpose, and courage.",
        "price": 299,
        "image": "https://via.placeholder.com/200x300/7c2d12/fef3c7?text=The+Alchemist",
        "category": "Fiction",
        "stock": 20,
        "isNew": False,
        "isBestseller": True,
        "discount": 5,
    },
    {
        "seed_key": "1984",
        "title": "1984",
        "author": "George Orwell",
        "description": "A dystopian classic about surveillance and freedom.",
        "price": 349,
        "image": "https://via.placeholder.com/200x300/111827/e5e7eb?text=1984",
        "category": "Classic",
        "stock": 14,
        "isNew": False,
        "isBestseller": False,
        "discount": 0,
    },
    {
        "seed_key": "to-kill-a-mockingbird",
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "description": "A powerful story of justice, empathy, and moral courage.",
        "price": 379,
        "image": "https://via.placeholder.com/200x300/1e3a8a/dbeafe?text=Mockingbird",
        "category": "Classic",
        "stock": 10,
        "isNew": False,
        "isBestseller": True,
        "discount": 7,
    },
    {
        "seed_key": "sapiens",
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "description": "A sweeping history of humankind from the Stone Age to today.",
        "price": 599,
        "image": "https://via.placeholder.com/200x300/134e4a/ccfbf1?text=Sapiens",
        "category": "History",
        "stock": 16,
        "isNew": True,
        "isBestseller": True,
        "discount": 12,
    },
    {
        "seed_key": "ikigai",
        "title": "Ikigai",
        "author": "Hector Garcia",
        "description": "Japanese wisdom for finding meaning and balance in life.",
        "price": 320,
        "image": "https://via.placeholder.com/200x300/7f1d1d/fee2e2?text=Ikigai",
        "category": "Lifestyle",
        "stock": 24,
        "isNew": False,
        "isBestseller": True,
        "discount": 15,
    },
    {
        "seed_key": "rich-dad-poor-dad",
        "title": "Rich Dad Poor Dad",
        "author": "Robert Kiyosaki",
        "description": "Lessons on money, investing, and financial mindset.",
        "price": 410,
        "image": "https://via.placeholder.com/200x300/78350f/fef3c7?text=Rich+Dad",
        "category": "Finance",
        "stock": 15,
        "isNew": False,
        "isBestseller": True,
        "discount": 10,
    },
    {
        "seed_key": "zero-to-one",
        "title": "Zero to One",
        "author": "Peter Thiel",
        "description": "Notes on startups, innovation, and building the future.",
        "price": 429,
        "image": "https://via.placeholder.com/200x300/0f766e/ccfbf1?text=Zero+to+One",
        "category": "Business",
        "stock": 9,
        "isNew": False,
        "isBestseller": False,
        "discount": 6,
    },
    {
        "seed_key": "clean-code",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "description": "A handbook of agile software craftsmanship.",
        "price": 699,
        "image": "https://via.placeholder.com/200x300/1d4ed8/dbeafe?text=Clean+Code",
        "category": "Technology",
        "stock": 11,
        "isNew": True,
        "isBestseller": True,
        "discount": 9,
    },
    {
        "seed_key": "pragmatic-programmer",
        "title": "The Pragmatic Programmer",
        "author": "Andrew Hunt",
        "description": "Practical advice for becoming a better software developer.",
        "price": 649,
        "image": "https://via.placeholder.com/200x300/4338ca/e0e7ff?text=Pragmatic",
        "category": "Technology",
        "stock": 8,
        "isNew": True,
        "isBestseller": False,
        "discount": 11,
    },
    {
        "seed_key": "thinking-fast-and-slow",
        "title": "Thinking, Fast and Slow",
        "author": "Daniel Kahneman",
        "description": "An exploration of human judgment, intuition, and bias.",
        "price": 540,
        "image": "https://via.placeholder.com/200x300/4b5563/f3f4f6?text=Fast+and+Slow",
        "category": "Psychology",
        "stock": 13,
        "isNew": False,
        "isBestseller": True,
        "discount": 4,
    },
    {
        "seed_key": "mans-search-for-meaning",
        "title": "Man's Search for Meaning",
        "author": "Viktor E. Frankl",
        "description": "A moving reflection on suffering, purpose, and resilience.",
        "price": 289,
        "image": "https://via.placeholder.com/200x300/3f3f46/f4f4f5?text=Meaning",
        "category": "Psychology",
        "stock": 19,
        "isNew": False,
        "isBestseller": True,
        "discount": 5,
    },
    {
        "seed_key": "harry-potter-1",
        "title": "Harry Potter and the Sorcerer's Stone",
        "author": "J.K. Rowling",
        "description": "The magical first journey into Hogwarts and wizardry.",
        "price": 399,
        "image": "https://via.placeholder.com/200x300/581c87/f3e8ff?text=Harry+Potter",
        "category": "Fantasy",
        "stock": 22,
        "isNew": False,
        "isBestseller": True,
        "discount": 10,
    },
    {
        "seed_key": "the-hobbit",
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "description": "A beloved adventure through Middle-earth.",
        "price": 369,
        "image": "https://via.placeholder.com/200x300/14532d/dcfce7?text=The+Hobbit",
        "category": "Fantasy",
        "stock": 17,
        "isNew": False,
        "isBestseller": False,
        "discount": 3,
    },
    {
        "seed_key": "becoming",
        "title": "Becoming",
        "author": "Michelle Obama",
        "description": "A deeply personal memoir about growth and leadership.",
        "price": 559,
        "image": "https://via.placeholder.com/200x300/9d174d/fce7f3?text=Becoming",
        "category": "Biography",
        "stock": 12,
        "isNew": True,
        "isBestseller": True,
        "discount": 10,
    },
    {
        "seed_key": "subtle-art",
        "title": "The Subtle Art of Not Giving a F*ck",
        "author": "Mark Manson",
        "description": "A blunt and practical take on values and priorities.",
        "price": 389,
        "image": "https://via.placeholder.com/200x300/7f1d1d/fee2e2?text=Subtle+Art",
        "category": "Self Help",
        "stock": 21,
        "isNew": False,
        "isBestseller": True,
        "discount": 14,
    },
    {
        "seed_key": "shoe-dog",
        "title": "Shoe Dog",
        "author": "Phil Knight",
        "description": "The inspiring story behind the creation of Nike.",
        "price": 479,
        "image": "https://via.placeholder.com/200x300/111827/e5e7eb?text=Shoe+Dog",
        "category": "Business",
        "stock": 10,
        "isNew": False,
        "isBestseller": False,
        "discount": 6,
    },
    {
        "seed_key": "cant-hurt-me",
        "title": "Can't Hurt Me",
        "author": "David Goggins",
        "description": "A memoir about discipline, mindset, and mental toughness.",
        "price": 525,
        "image": "https://via.placeholder.com/200x300/27272a/f4f4f5?text=Cant+Hurt+Me",
        "category": "Motivation",
        "stock": 14,
        "isNew": True,
        "isBestseller": True,
        "discount": 8,
    },
    {
        "seed_key": "dune",
        "title": "Dune",
        "author": "Frank Herbert",
        "description": "A sweeping sci-fi epic of politics, prophecy, and survival.",
        "price": 449,
        "image": "https://via.placeholder.com/200x300/7c2d12/fef3c7?text=Dune",
        "category": "Science Fiction",
        "stock": 16,
        "isNew": False,
        "isBestseller": True,
        "discount": 7,
    },
]

SAMPLE_BOOKS_STATE_ID = "sample_books_initialized"


def _strip_value(value):
    return str(value or "").strip()


def _pick_text(payload, *keys):
    for key in keys:
        if key in payload and payload.get(key) is not None:
            text = _strip_value(payload.get(key))
            if text:
                return text
    return ""


def _book_name(doc):
    return doc.get("name") or doc.get("title") or ""


def _book_image(doc):
    return doc.get("imageUrl") or doc.get("image") or ""


def _book_categories(doc):
    raw_categories = doc.get("categories")
    if isinstance(raw_categories, list):
        categories = [str(value).strip() for value in raw_categories if str(value).strip()]
        if categories:
            return categories

    primary = str(doc.get("category") or "").strip()
    return [primary] if primary else []


def _book_created_at(doc):
    return doc.get("createdAt") or doc.get("created_at")


def _normalize_categories(payload):
    raw_categories = payload.get("categories")
    candidates = raw_categories if isinstance(raw_categories, list) else []
    primary = _pick_text(payload, "category")
    if primary:
        candidates = [*candidates, primary]

    categories = []
    seen = set()
    for value in candidates:
        text = _strip_value(value)
        lowered = text.lower()
        if not text or lowered in seen:
            continue
        seen.add(lowered)
        categories.append(text)

    return categories


def _serialize_book(doc):
    name = _book_name(doc)
    image_url = _book_image(doc)
    categories = _book_categories(doc)
    created_at = _book_created_at(doc)
    return {
        "id": str(doc.get("_id")),
        "name": name,
        "title": name,
        "author": doc.get("author", ""),
        "description": doc.get("description", ""),
        "price": doc.get("price", 0),
        "rating": doc.get("rating", 0),
        "ratings": doc.get("ratings", {}),
        "imageUrl": image_url,
        "image": image_url,
        "category": categories[0] if categories else "",
        "categories": categories,
        "stock": doc.get("stock", 0),
        "isNew": doc.get("isNew", False),
        "isBestseller": doc.get("isBestseller", False),
        "discount": doc.get("discount", 0),
        "createdAt": created_at.isoformat() if created_at else None,
    }


def _sample_book_document(seed):
    now = datetime.now(timezone.utc)
    return {
        "name": seed["title"],
        "title": seed["title"],
        "author": seed["author"],
        "description": seed["description"],
        "price": float(seed["price"]),
        "rating": 0,
        "ratings": {},
        "imageUrl": seed["image"],
        "image": seed["image"],
        "category": seed["category"],
        "categories": [seed["category"]],
        "stock": int(seed["stock"]),
        "isNew": bool(seed["isNew"]),
        "isBestseller": bool(seed["isBestseller"]),
        "discount": int(seed["discount"]),
        "createdAt": now,
        "created_at": now,
        "seed_key": seed["seed_key"],
    }


def _parse_price(value):
    try:
        price = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("price must be a number") from exc

    if price <= 0:
        raise ValueError("price must be greater than 0")
    return price


def _parse_stock(value):
    try:
        stock = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("stock must be an integer") from exc

    if stock < 0:
        raise ValueError("stock cannot be negative")
    return stock


def _parse_discount(value):
    try:
        discount = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("discount must be a number") from exc

    if not 0 <= discount <= 100:
        raise ValueError("discount must be between 0 and 100")
    return discount


def seed_sample_books(force=False):
    db = get_db()
    inserted = 0

    for seed in SAMPLE_BOOKS:
        existing = db.books.find_one({"seed_key": seed["seed_key"]})
        if existing and not force:
            continue

        if existing and force:
            db.books.update_one({"_id": existing["_id"]}, {"$set": _sample_book_document(seed)})
            continue

        db.books.insert_one(_sample_book_document(seed))
        inserted += 1

    db.app_state.update_one(
        {"_id": SAMPLE_BOOKS_STATE_ID},
        {"$set": {"value": True, "updatedAt": datetime.now(timezone.utc)}},
        upsert=True,
    )

    return {"inserted": inserted, "total_sample_books": len(SAMPLE_BOOKS)}


def ensure_sample_books():
    db = get_db()
    already_initialized = db.app_state.find_one({"_id": SAMPLE_BOOKS_STATE_ID})
    if db.books.count_documents({}) == 0 and not already_initialized:
        seed_sample_books()
    elif db.books.count_documents({}) > 0 and not already_initialized:
        db.app_state.update_one(
            {"_id": SAMPLE_BOOKS_STATE_ID},
            {"$set": {"value": True, "updatedAt": datetime.now(timezone.utc)}},
            upsert=True,
        )


def list_books(search=""):
    ensure_sample_books()
    db = get_db()
    search = (search or "").strip()
    query = {}

    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"author": {"$regex": search, "$options": "i"}},
                {"categories": {"$regex": search, "$options": "i"}},
            ]
        }

    docs = db.books.find(query).sort("created_at", -1)
    return [_serialize_book(doc) for doc in docs]


def get_book(book_id):
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")
    return _serialize_book(doc)


def create_book(payload):
    name = _pick_text(payload, "name", "title")
    author = _pick_text(payload, "author")
    categories = _normalize_categories(payload)
    description = _strip_value(payload.get("description"))
    image_url = _pick_text(payload, "imageUrl", "image")

    if not name:
        raise ValueError("name is required")
    if not author:
        raise ValueError("author is required")
    if not categories:
        raise ValueError("category is required")
    if not image_url:
        raise ValueError("imageUrl is required")

    price = _parse_price(payload.get("price"))
    stock = _parse_stock(payload.get("stock", 0))
    discount = _parse_discount(payload.get("discount", 0))

    now = datetime.now(timezone.utc)
    book_doc = {
        "name": name,
        "title": name,
        "author": author,
        "description": description,
        "price": price,
        "rating": 0,
        "ratings": {},
        "imageUrl": image_url,
        "image": image_url,
        "category": categories[0],
        "categories": categories,
        "stock": stock,
        "isNew": bool(payload.get("isNew")),
        "isBestseller": bool(payload.get("isBestseller")),
        "discount": discount,
        "createdAt": now,
        "created_at": now,
    }

    db = get_db()
    result = db.books.insert_one(book_doc)
    book_doc["_id"] = result.inserted_id
    return _serialize_book(book_doc)


def update_book(book_id, payload):
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")

    updates = {}

    if "name" in payload or "title" in payload:
        name = _pick_text(payload, "name", "title")
        if not name:
            raise ValueError("name is required")
        updates["name"] = name
        updates["title"] = name

    if "author" in payload:
        value = _strip_value(payload.get("author"))
        if not value:
            raise ValueError("author is required")
        updates["author"] = value

    if "category" in payload or "categories" in payload:
        categories = _normalize_categories(payload)
        if not categories:
            raise ValueError("category is required")
        updates["category"] = categories[0]
        updates["categories"] = categories

    if "description" in payload and payload["description"] is not None:
        updates["description"] = _strip_value(payload.get("description"))

    if "imageUrl" in payload or "image" in payload:
        image_url = _pick_text(payload, "imageUrl", "image")
        if not image_url:
            raise ValueError("imageUrl is required")
        updates["imageUrl"] = image_url
        updates["image"] = image_url

    if "price" in payload and payload["price"] not in (None, ""):
        updates["price"] = _parse_price(payload.get("price"))

    if "stock" in payload and payload["stock"] not in (None, ""):
        updates["stock"] = _parse_stock(payload.get("stock"))

    if "discount" in payload and payload["discount"] not in (None, ""):
        updates["discount"] = _parse_discount(payload.get("discount"))

    for flag in ("isNew", "isBestseller"):
        if flag in payload:
            updates[flag] = bool(payload[flag])

    if updates:
        db.books.update_one({"_id": oid}, {"$set": updates})

    return _serialize_book(db.books.find_one({"_id": oid}))


def delete_book(book_id):
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    db = get_db()
    result = db.books.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise ValueError("book not found")
    return {"message": "deleted"}


def set_user_rating(book_id, payload):
    try:
        oid = ObjectId(book_id)
    except Exception as exc:
        raise ValueError("invalid book id") from exc

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise ValueError("email is required")

    try:
        stars = float(payload.get("stars") or payload.get("rating", 0))
    except (TypeError, ValueError) as exc:
        raise ValueError("stars must be a number") from exc

    if not 1 <= stars <= 5:
        raise ValueError("rating must be between 1 and 5")

    db = get_db()
    doc = db.books.find_one({"_id": oid})
    if not doc:
        raise ValueError("book not found")

    ratings_map = doc.get("ratings", {}) or {}
    ratings_map[email] = stars

    values = list(ratings_map.values())
    avg = round(sum(values) / len(values), 2) if values else 0

    db.books.update_one({"_id": oid}, {"$set": {"ratings": ratings_map, "rating": avg}})
    return _serialize_book(db.books.find_one({"_id": oid}))


def search_books(query, by="all"):
    db = get_db()

    if by == "id":
        try:
            doc = db.books.find_one({"_id": ObjectId(query)})
            return [_serialize_book(doc)] if doc else []
        except Exception:
            return []

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    if by == "name":
        search_filter = {"$or": [{"name": pattern}, {"title": pattern}]}
    elif by == "author":
        search_filter = {"author": pattern}
    else:
        search_filter = {"$or": [{"name": pattern}, {"title": pattern}, {"author": pattern}, {"category": pattern}, {"categories": pattern}]}

    docs = db.books.find(search_filter).sort("created_at", -1)
    return [_serialize_book(doc) for doc in docs]


def total_revenue():
    db = get_db()
    result = db.orders.aggregate([{"$group": {"_id": None, "total": {"$sum": "$total"}}}])
    for doc in result:
        return round(doc.get("total", 0), 2)
    return 0.0
