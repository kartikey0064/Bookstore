import re
import secrets
from datetime import datetime, timedelta

from pymongo import ASCENDING
from werkzeug.security import check_password_hash, generate_password_hash

from ..database.db_connection import get_db
from .email_service import send_otp_email


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
VERIFICATION_EXPIRY_MINUTES = 15
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_indexes_ready = False


def _now():
    # PyMongo returns BSON datetimes as naive UTC by default, so keep OTP
    # timestamps naive too and compare like-for-like.
    return datetime.utcnow()


def _normalize_email(value):
    return (value or "").strip().lower()


def _validate_email(email):
    if not email:
        raise ValueError("email is required")
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address")


def _otp_collection():
    _ensure_indexes()
    return get_db().email_otps


def _verification_collection():
    _ensure_indexes()
    return get_db().email_verifications


def _ensure_indexes():
    global _indexes_ready
    if _indexes_ready:
        return

    db = get_db()
    db.email_otps.create_index([("email", ASCENDING)])
    db.email_otps.create_index("expires_at", expireAfterSeconds=0)

    db.email_verifications.create_index([("email", ASCENDING)], unique=True)
    db.email_verifications.create_index("expires_at", expireAfterSeconds=0)
    _indexes_ready = True


def _clear_stale_records(email=None):
    cutoff = _now()
    _otp_collection().delete_many({"expires_at": {"$lte": cutoff}})
    _verification_collection().delete_many({"expires_at": {"$lte": cutoff}})


def _generate_otp():
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def send_signup_otp(payload):
    email = _normalize_email(payload.get("email"))
    _validate_email(email)
    _clear_stale_records(email)

    db = get_db()
    if db.users.find_one({"email": email}):
        raise ValueError("email already registered")

    otp = _generate_otp()
    expires_at = _now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    _otp_collection().delete_many({"email": email})
    _verification_collection().delete_many({"email": email})
    _otp_collection().insert_one(
        {
            "email": email,
            "otp_hash": generate_password_hash(otp),
            "expires_at": expires_at,
            "created_at": _now(),
        }
    )

    send_otp_email(email, otp)
    return {
        "message": "OTP sent successfully. Please check your email.",
        "expires_in_seconds": OTP_EXPIRY_MINUTES * 60,
    }


def verify_signup_otp(payload):
    email = _normalize_email(payload.get("email"))
    otp = (payload.get("otp") or "").strip()

    _validate_email(email)
    if not otp or not otp.isdigit() or len(otp) != OTP_LENGTH:
        raise ValueError("Enter the 6-digit OTP")

    _clear_stale_records(email)

    otp_record = _otp_collection().find_one({"email": email}, sort=[("created_at", -1)])
    if not otp_record:
        raise ValueError("OTP not found or expired. Please request a new code.")

    if otp_record["expires_at"] <= _now():
        _otp_collection().delete_many({"email": email})
        raise ValueError("OTP expired. Please request a new code.")

    if not check_password_hash(otp_record["otp_hash"], otp):
        raise ValueError("Invalid OTP. Please try again.")

    _otp_collection().delete_many({"email": email})
    _verification_collection().update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "verified_at": _now(),
                "expires_at": _now() + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES),
            }
        },
        upsert=True,
    )

    return {"message": "Email verified successfully. You can continue signing up."}


def consume_email_verification(email):
    normalized_email = _normalize_email(email)
    _validate_email(normalized_email)
    _clear_stale_records(normalized_email)

    verification = _verification_collection().find_one({"email": normalized_email})
    if not verification:
        raise ValueError("Please verify your email with OTP before creating an account.")

    if verification["expires_at"] <= _now():
        _verification_collection().delete_many({"email": normalized_email})
        raise ValueError("Your email verification expired. Please request a new OTP.")

    _verification_collection().delete_many({"email": normalized_email})
