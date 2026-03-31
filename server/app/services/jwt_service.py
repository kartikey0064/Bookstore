import os
from datetime import datetime, timedelta, timezone

import jwt


def generate_auth_token(user):
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise ValueError("JWT_SECRET_KEY is not configured on the server")

    expires_in = int(os.getenv("JWT_EXPIRES_IN_SECONDS", "86400"))
    issued_at = datetime.now(timezone.utc)

    payload = {
        "sub": user.get("email"),
        "role": user.get("role", "user"),
        "name": user.get("name", ""),
        "auth_provider": user.get("auth_provider", "local"),
        "iat": issued_at,
        "exp": issued_at + timedelta(seconds=expires_in),
    }

    return jwt.encode(payload, secret, algorithm="HS256")


def decode_auth_token(token):
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise ValueError("JWT_SECRET_KEY is not configured on the server")

    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise ValueError("invalid auth token") from exc
