from pymongo import MongoClient
import config

_client = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not config.MONGODB_URI:
            raise RuntimeError("MONGODB_URI is empty. Check .env")
        _client = MongoClient(config.MONGODB_URI)
    return _client

def get_parts_collection():
    client = get_client()
    return client[config.MONGODB_DB][config.PARTS_COLLECTION]
