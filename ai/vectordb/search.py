from typing import Any, Dict, List, Optional
from ai import config


def parts_vector_search(
    col,
    query_vector: List[float],
    limit: int = 10,
    num_candidates: int = 200,
    filters: Optional[Dict[str, Any]] = None,
):
    if len(query_vector) != config.EMBEDDING_DIMS:
        raise ValueError(f"query_vector must be length {config.EMBEDDING_DIMS}")

    stage = {
        "$vectorSearch": {
            "index": config.ATLAS_VECTOR_INDEX_PARTS,
            "path": config.VECTOR_FIELD,
            "queryVector": query_vector,
            "numCandidates": int(num_candidates),
            "limit": int(limit),
        }
    }

    # 선택 필터
    if filters:
        atlas_filter: Dict[str, Any] = {}
        if "category" in filters:
            atlas_filter["category"] = {"$in": filters["category"]}
        if atlas_filter:
            stage["$vectorSearch"]["filter"] = atlas_filter

    pipeline = [
        stage,
        {
            "$project": {
                "_id": 0,
                "partId": 1,
                "category": 1,
                "bbox": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    return list(col.aggregate(pipeline))
