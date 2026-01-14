import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection from shared environment or constructed URI
# Docker 내부 통신용 URI 구조: mongodb://user:pass@host:port/db?authSource=admin
MONGODB_URI = os.getenv("AI_MONGODB_URI") # 전체 URI가 필요할 경우
MONGODB_DB = os.getenv("AI_MONGODB_NAME")

# AI Specific settings
PARTS_COLLECTION = os.getenv("AI_PARTS_COLLECTION")
ATLAS_VECTOR_INDEX_PARTS = os.getenv("AI_VECTOR_INDEX")

VECTOR_FIELD = os.getenv("AI_VECTOR_FIELD")
EMBEDDING_DIMS = int(os.getenv("AI_EMBEDDING_DIMS", "512"))
