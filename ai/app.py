from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Optional
import os

# ✅ .env 자동 로드(로컬 개발 편함)
#   - requirements.txt에 python-dotenv 추가 필요(아래 실행법 참고)
from dotenv import load_dotenv
load_dotenv()

import config
from db import get_db, get_parts_collection
from vectordb.seed import seed_dummy_parts
from vectordb.search import parts_vector_search
from ldr.import_to_mongo import import_ldr_bom, import_car_ldr

# ✅ 나노바나나(Gemini Image) SDK
from google import genai
from google.genai import types

app = FastAPI(title="Brickers AI API", version="0.1.0")

# ✅ Gemini Client (환경변수로 키 읽음)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


class VectorSearchRequest(BaseModel):
    query_vector: List[float] = Field(...)
    limit: int = 10
    num_candidates: int = 200
    category: Optional[List[str]] = None


class LdrImportRequest(BaseModel):
    job_id: str
    ldr_path: Optional[str] = None  # 없으면 car.ldr 기본 사용


@app.get("/health")
def health():
    return {"status": "ok", "env": config.ENV}


@app.post("/ldr/import")
def api_ldr_import(req: LdrImportRequest):
    # ldr_path를 안 주면 car.ldr 기본
    if req.ldr_path:
        result = import_ldr_bom(job_id=req.job_id, ldr_path=req.ldr_path)
    else:
        result = import_car_ldr(job_id=req.job_id)

    return {"ok": True, **result}


@app.get("/mongo/ping")
def mongo_ping():
    db = get_db()
    return {"db": config.MONGODB_DB, "collections": db.list_collection_names()}


@app.post("/vectordb/seed")
def api_seed():
    n = seed_dummy_parts(overwrite=True)
    return {"inserted": n}


@app.post("/vectordb/parts/search")
def api_search(req: VectorSearchRequest):
    if len(req.query_vector) != config.EMBEDDING_DIMS:
        raise HTTPException(
            status_code=400,
            detail=f"query_vector must be length {config.EMBEDDING_DIMS}, got {len(req.query_vector)}",
        )

    col = get_parts_collection()
    filters = {"category": req.category} if req.category else None

    hits = parts_vector_search(
        col=col,
        query_vector=req.query_vector,
        limit=req.limit,
        num_candidates=req.num_candidates,
        filters=filters,
    )
    return {"count": len(hits), "items": hits}


# =========================================================
# ✅ Kids Mode: 나노바나나로 "3D 렌더 이미지 1장"만 반환
# =========================================================
@app.post("/v1/kids/render-image")
async def kids_render_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="image only")

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing")

    img_bytes = await file.read()

    model = os.getenv("NANO_BANANA_MODEL", "gemini-2.5-flash-image")

    prompt = """
    Turn the uploaded image into a single LEGO-like 3D render image.
    - clean white studio background
    - soft shadow
    - keep the main subject consistent
    - output ONLY ONE image
    """

    resp = client.models.generate_content(
        model=model,
        contents=[
            {"text": prompt},
            {"inline_data": {"mime_type": file.content_type, "data": img_bytes}},
        ],
        config=types.GenerateContentConfig(
            response_modalities=["Text", "Image"]
        ),
    )

    # ✅ 응답에서 이미지 bytes 찾기
    out_bytes = None
    out_mime = "image/png"

    if not resp.candidates:
        raise HTTPException(status_code=500, detail="no candidates from model")

    parts = resp.candidates[0].content.parts if resp.candidates[0].content else []
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            out_bytes = inline.data
            out_mime = inline.mime_type or out_mime
            break

    if out_bytes is None:
        raise HTTPException(status_code=500, detail="no image returned from model")

    return Response(content=out_bytes, media_type=out_mime)


# =========================================================

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
