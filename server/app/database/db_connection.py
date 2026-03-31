from pymongo import MongoClient
import certifi
import os

_client = None

def _build_client_options(uri):
    options = {
        "serverSelectionTimeoutMS": 5000,
        "connectTimeoutMS": 5000,
    }

    normalized = (uri or "").strip().lower()
    if normalized.startswith("mongodb+srv://") or "tls=true" in normalized or "ssl=true" in normalized:
        options["tlsCAFile"] = certifi.where()

    return options

def get_client():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI is not set")
        _client = MongoClient(uri, **_build_client_options(uri))
    return _client

def get_db():
    db_name = os.getenv("MONGO_DB", "appdb")
    return get_client()[db_name]

def ping_db():
    get_client().admin.command("ping")
