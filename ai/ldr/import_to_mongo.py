from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Dict

from pymongo.collection import Collection

from db import get_db
from ldr.bom import parse_ldr_bom


def get_boms_collection() -> Collection:
    return get_db()["boms"]


def bom_to_items(bom) -> List[dict]:
    items = []
    # bom: Dict[BomKey, int] 형태 (BomKey.part, BomKey.color)
    for k, qty in sorted(bom.items(), key=lambda x: (-x[1], x[0].part, x[0].color)):
        items.append({"part": k.part, "color": k.color, "qty": qty})
    return items


def import_ldr_bom(job_id: str, ldr_path: str) -> Dict:
    bom = parse_ldr_bom(ldr_path)
    items = bom_to_items(bom)
    now = datetime.utcnow()

    doc = {
        "jobId": job_id,
        "source": {"type": "ldr", "path": str(Path(ldr_path).resolve())},
        "uniqueItems": len(items),
        "totalQty": sum(i["qty"] for i in items),
        "items": items,
        "updatedAt": now,
    }

    col = get_boms_collection()
    col.update_one(
        {"jobId": job_id},
        {"$set": doc, "$setOnInsert": {"createdAt": now}},
        upsert=True,
    )

    return {
        "jobId": job_id,
        "uniqueItems": doc["uniqueItems"],
        "totalQty": doc["totalQty"],
    }


# ✅ car.ldr “고정 테스트”용 헬퍼 (원하면 삭제해도 됨)
def import_car_ldr(job_id: str = "job_car_001") -> Dict:
    car_path = Path(__file__).resolve().parent / "car.ldr"  # ai/ldr/car.ldr
    return import_ldr_bom(job_id=job_id, ldr_path=str(car_path))
