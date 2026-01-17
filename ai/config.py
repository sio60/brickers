import os
from pathlib import Path
from dotenv import load_dotenv

# ✅ 실행 위치와 상관없이 ai/.env 로드
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ENV = os.getenv("ENV", "local")

################################
# MongoDB Atlas (옵션)
################################
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "brickers")
PARTS_COLLECTION = os.getenv("PARTS_COLLECTION", "ldraw_parts")

################################
# Atlas Vector Search (옵션)
################################
ATLAS_VECTOR_INDEX_PARTS = os.getenv("ATLAS_VECTOR_INDEX_PARTS", "")
VECTOR_FIELD = os.getenv("VECTOR_FIELD", "embedding")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "512"))

################################
# Kids Render (옵션이지만 거의 필수)
################################
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NANO_BANANA_MODEL = os.getenv("NANO_BANANA_MODEL", "gemini-2.5-flash-image")


def require_env(name: str) -> str:
    """
    ✅ 특정 기능에서만 필요한 env를 그때 검증하기 위한 함수.
    - 서버 부팅 시점엔 터지지 않음
    - 실제로 Mongo/Vector 기능 호출할 때만 강제 가능
    """
    v = os.getenv(name)
    if v is None or not str(v).strip():
        raise RuntimeError(f"{name} is empty. Check ai/.env")
    return v


def mongo_ready() -> bool:
    """Mongo 기능 사용 가능 여부"""
    return bool(MONGODB_URI.strip())


def vector_ready() -> bool:
    """Vector Search 기능 사용 가능 여부"""
    return bool(MONGODB_URI.strip()) and bool(ATLAS_VECTOR_INDEX_PARTS.strip())


def kids_render_ready() -> bool:
    """Kids 렌더 기능 사용 가능 여부"""
    return bool(GEMINI_API_KEY.strip())
