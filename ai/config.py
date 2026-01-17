import os
from pathlib import Path
from dotenv import load_dotenv

# ✅ 실행 위치와 상관없이 ai/.env 로드
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ENV = os.getenv("ENV", "local")

################################
# MongoDB Atlas
################################
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "brickers")
PARTS_COLLECTION = os.getenv("PARTS_COLLECTION", "ldraw_parts")

################################
# Atlas Vector Search
################################
ATLAS_VECTOR_INDEX_PARTS = os.getenv("ATLAS_VECTOR_INDEX_PARTS")
VECTOR_FIELD = os.getenv("VECTOR_FIELD", "embedding")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "512"))

# ✅ 필수값 검증 (여기서 터지면 env 문제를 즉시 알 수 있음)
def _require(name: str, v: str | None) -> str:
    if v is None or not str(v).strip():
        raise RuntimeError(f"{name} is empty. Check ai/.env")
    return v

MONGODB_URI = _require("MONGODB_URI", MONGODB_URI)
ATLAS_VECTOR_INDEX_PARTS = _require("ATLAS_VECTOR_INDEX_PARTS", ATLAS_VECTOR_INDEX_PARTS)
HF_EMBED_MODEL = os.getenv("HF_EMBED_MODEL", "intfloat/multilingual-e5-small")
