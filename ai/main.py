import os
import sys
import uvicorn

# ✅ ai 폴더의 부모(= brickers)를 sys.path에 추가
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if __name__ == "__main__":
    uvicorn.run(
        "ai.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
