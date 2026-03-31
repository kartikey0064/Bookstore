# ============================================================
#  ORDER SERVICE
#  Handles creating orders and fetching them per user or all.
# ============================================================

from datetime import datetime, timezone
from ..database.db_connection import get_db


# ─── Serialiser ──────────────────────────────────────────────
def _serialize_order(doc):
    return {
        "id":        str(doc.get("_id")),
        "userEmail": doc.get("user_email", ""),
        "items":     doc.get("items",      []),
        "subtotal":  doc.get("subtotal",    0),
        "shipping":  doc.get("shipping",    0),
        "total":     doc.get("total",       0),
        "status":    doc.get("status",  "Processing"),
        "address":   doc.get("address",    {}),
        "createdAt": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


# ─── Per-user orders ──────────────────────────────────────────
def list_orders(email):
    email_value = (email or "").strip().lower()
    if not email_value:
        raise ValueError("email is required")
    db   = get_db()
    docs = db.orders.find({"user_email": email_value}).sort("created_at", -1)
    return [_serialize_order(doc) for doc in docs]


# ─── All orders (admin) ───────────────────────────────────────
def list_all_orders():
    db   = get_db()
    docs = db.orders.find().sort("created_at", -1)
    return [_serialize_order(doc) for doc in docs]


# ─── Create order ─────────────────────────────────────────────
def create_order(payload):
    email   = (payload.get("email") or "").strip().lower()
    items   =  payload.get("items") or []
    address =  payload.get("address") or {}

    if not email:
        raise ValueError("email is required")
    if not isinstance(items, list) or not items:
        raise ValueError("items are required")

    subtotal = 0.0
    normalized_items = []
    for item in items:
        price    = float(item.get("price")    or 0)
        quantity = int(item.get("quantity")   or 1)
        subtotal += price * quantity
        normalized_items.append({
            "id":       item.get("id"),
            "title":    item.get("title",  ""),
            "price":    price,
            "quantity": quantity,
            "image":    item.get("image",  ""),
        })

    shipping = float(payload.get("shipping") or 0)
    total    = subtotal + shipping

    order_doc = {
        "user_email": email,
        "items":      normalized_items,
        "subtotal":   round(subtotal, 2),
        "shipping":   round(shipping, 2),
        "total":      round(total, 2),
        "status":     "Processing",
        "address": {
            "name":       (address.get("name")       or "").strip(),
            "line1":      (address.get("line1")      or "").strip(),
            "city":       (address.get("city")       or "").strip(),
            "postalCode": (address.get("postalCode") or "").strip(),
            "country":    (address.get("country")    or "").strip(),
        },
        "created_at": datetime.now(timezone.utc),
    }

    db     = get_db()
    result = db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    return _serialize_order(order_doc)
