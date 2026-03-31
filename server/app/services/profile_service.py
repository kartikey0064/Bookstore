from ..database.db_connection import get_db


def _serialize_profile(doc):
    return {
        "email": doc.get("email", ""),
        "name": doc.get("name", ""),
        "phone": doc.get("phone", ""),
        "addressLine": doc.get("address_line", ""),
        "city": doc.get("city", ""),
        "postalCode": doc.get("postal_code", ""),
        "country": doc.get("country", ""),
    }


def get_profile(email):
    email_value = (email or "").strip().lower()
    if not email_value:
        raise ValueError("email is required")

    db = get_db()
    user = db.users.find_one({"email": email_value})
    if not user:
        raise ValueError("user not found")
    return _serialize_profile(user)


def update_profile(payload):
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise ValueError("email is required")

    updates = {
        "name": (payload.get("name") or "").strip(),
        "phone": (payload.get("phone") or "").strip(),
        "address_line": (payload.get("addressLine") or "").strip(),
        "city": (payload.get("city") or "").strip(),
        "postal_code": (payload.get("postalCode") or "").strip(),
        "country": (payload.get("country") or "").strip(),
    }

    db = get_db()
    result = db.users.update_one({"email": email}, {"$set": updates})
    if result.matched_count == 0:
        raise ValueError("user not found")

    user = db.users.find_one({"email": email})
    return _serialize_profile(user)
