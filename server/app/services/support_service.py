from datetime import datetime, timezone

from ..database.db_connection import get_db


def _serialize_ticket(doc):
    return {
        "id": str(doc.get("_id")),
        "userEmail": doc.get("user_email", ""),
        "subject": doc.get("subject", ""),
        "message": doc.get("message", ""),
        "status": doc.get("status", "Open"),
        "createdAt": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


def list_tickets(email):
    email_value = (email or "").strip().lower()
    if not email_value:
        raise ValueError("email is required")

    db = get_db()
    docs = db.support_tickets.find({"user_email": email_value}).sort("created_at", -1)
    return [_serialize_ticket(doc) for doc in docs]


def create_ticket(payload):
    email = (payload.get("email") or "").strip().lower()
    subject = (payload.get("subject") or "").strip()
    message = (payload.get("message") or "").strip()

    if not email:
        raise ValueError("email is required")
    if not subject:
        raise ValueError("subject is required")
    if not message:
        raise ValueError("message is required")

    ticket_doc = {
        "user_email": email,
        "subject": subject,
        "message": message,
        "status": "Open",
        "created_at": datetime.now(timezone.utc),
    }

    db = get_db()
    result = db.support_tickets.insert_one(ticket_doc)
    ticket_doc["_id"] = result.inserted_id
    return _serialize_ticket(ticket_doc)
