# ============================================================
#  ORDER SERVICE
#  Handles creating orders and fetching them per user or all.
# ============================================================

from datetime import datetime, timezone
from bson import ObjectId
from ..database.db_connection import get_db


ORDER_STATUSES = {
    "processing": "Processing",
    "processed": "Processed",
    "confirmed": "Confirmed",
    "delivered": "Delivered",
}


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
        "payment":   doc.get("payment",    {}),
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


def update_order_status(order_id, status):
    try:
        oid = ObjectId(order_id)
    except Exception as exc:
        raise ValueError("invalid order id") from exc

    normalized = ORDER_STATUSES.get((status or "").strip().lower())
    if not normalized:
        raise ValueError("status must be one of: Processing, Processed, Confirmed, Delivered")

    db = get_db()
    result = db.orders.update_one({"_id": oid}, {"$set": {"status": normalized}})
    if result.matched_count == 0:
        raise ValueError("order not found")

    updated = db.orders.find_one({"_id": oid})
    return _serialize_order(updated)


# ─── Create order ─────────────────────────────────────────────
def create_order(payload):
    email   = (payload.get("email") or "").strip().lower()
    items   =  payload.get("items") or []
    address =  payload.get("address") or {}
    payment =  payload.get("payment") or {}

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
        "payment": {
            "provider":  (payment.get("provider") or "").strip(),
            "orderId":   (payment.get("orderId") or "").strip(),
            "paymentId": (payment.get("paymentId") or "").strip(),
            "signature": (payment.get("signature") or "").strip(),
            "amount":    payment.get("amount", 0),
            "currency":  (payment.get("currency") or "").strip(),
        },
        "created_at": datetime.now(timezone.utc),
    }

    db     = get_db()
    result = db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    return _serialize_order(order_doc)
