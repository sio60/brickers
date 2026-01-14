import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "brickers")

PARTS_COLLECTION = os.getenv("PARTS_COLLECTION", "ldraw_parts")
ATLAS_VECTOR_INDEX_PARTS = os.getenv("ATLAS_VECTOR_INDEX_PARTS", "idx_parts_vec")

VECTOR_FIELD = os.getenv("VECTOR_FIELD", "embedding")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "512"))
