from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

import config
from db import get_db, get_parts_collection
from vectordb.seed import seed_dummy_parts
from vectordb.search import parts_vector_search
from ldr.import_to_mongo import import_ldr_bom, import_car_ldr

app = FastAPI(title="Brickers AI API", version="0.1.0")


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
