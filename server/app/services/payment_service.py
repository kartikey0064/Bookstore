import hashlib
import hmac
import os
import uuid

from .order_service import create_order
from .profile_service import update_profile


def _clean(value):
    return (value or "").strip()


def _load_razorpay():
    try:
        import razorpay
    except ImportError as exc:
        raise ValueError(
            "Razorpay support requires the server dependencies from "
            "'server/requirements.txt'. Run 'pip install -r server/requirements.txt'."
        ) from exc

    return razorpay


def _get_client():
    key_id = _clean(os.getenv("RAZORPAY_KEY_ID"))
    key_secret = _clean(os.getenv("RAZORPAY_KEY_SECRET"))

    if not key_id or not key_secret:
        raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured on the server")

    razorpay = _load_razorpay()
    return razorpay.Client(auth=(key_id, key_secret))


def create_payment_order(payload):
    amount = float(payload.get("amount") or 0)
    user = payload.get("user") or {}
    if amount <= 0:
        raise ValueError("amount must be greater than zero")

    receipt = _clean(payload.get("receipt")) or f"book-{uuid.uuid4().hex[:12]}"
    address = _clean(user.get("address"))

    razorpay_order = _get_client().order.create(data={
        "amount": int(round(amount * 100)),
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "name": _clean(user.get("name"))[:120],
            "email": _clean(user.get("email"))[:120],
            "phone": _clean(user.get("phone"))[:20],
            "address": address[:250],
        },
    })

    return {
        "id": razorpay_order.get("id", ""),
        "amount": razorpay_order.get("amount", 0),
        "currency": razorpay_order.get("currency", "INR"),
        "receipt": razorpay_order.get("receipt", receipt),
    }


def verify_payment_and_create_order(payload):
    order_id = _clean(payload.get("razorpay_order_id"))
    payment_id = _clean(payload.get("razorpay_payment_id"))
    signature = _clean(payload.get("razorpay_signature"))
    email = _clean(payload.get("email")).lower()
    name = _clean(payload.get("name"))
    phone = _clean(payload.get("phone"))
    address_line = _clean(payload.get("address"))

    if not order_id or not payment_id or not signature:
        raise ValueError("payment verification details are required")
    if not email:
        raise ValueError("email is required")
    if len(phone) != 10 or not phone.isdigit():
        raise ValueError("phone must be exactly 10 digits")
    if not address_line:
        raise ValueError("address is required")

    secret = _clean(os.getenv("RAZORPAY_KEY_SECRET"))
    if not secret:
        raise ValueError("RAZORPAY_KEY_SECRET must be configured on the server")

    generated_signature = hmac.new(
        secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, signature):
        raise ValueError("payment signature verification failed")

    profile = update_profile({
        "email": email,
        "name": name,
        "phone": phone,
        "addressLine": address_line,
        "city": payload.get("city", ""),
        "postalCode": payload.get("postalCode", ""),
        "country": payload.get("country", ""),
    })

    order = create_order({
        "email": email,
        "items": payload.get("items") or [],
        "shipping": payload.get("shipping") or 0,
        "address": {
            "name": name,
            "line1": address_line,
            "city": payload.get("city", ""),
            "postalCode": payload.get("postalCode", ""),
            "country": payload.get("country", ""),
        },
        "payment": {
            "provider": "razorpay",
            "orderId": order_id,
            "paymentId": payment_id,
            "signature": signature,
            "amount": payload.get("amount", 0),
            "currency": payload.get("currency", "INR"),
        },
    })

    return {"order": order, "profile": profile}
