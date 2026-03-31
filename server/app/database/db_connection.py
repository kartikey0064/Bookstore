from pymongo import MongoClient
import certifi
import os

_client = None

def get_client():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI is not set")
        _client = MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            tlsCAFile=certifi.where(),
        )
    return _client

def get_db():
    db_name = os.getenv("MONGO_DB", "appdb")
    return get_client()[db_name]

def ping_db():
    get_client().admin.command("ping")
