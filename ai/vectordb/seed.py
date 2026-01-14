import random
import config
from db import get_parts_collection


def rand_vec(dims: int):
    return [random.uniform(-1, 1) for _ in range(dims)]


def seed_dummy_parts(overwrite: bool = True) -> int:
    col = get_parts_collection()

    samples = [
        ("3001", "Brick", 4, 2),
        ("3002", "Brick", 3, 2),
        ("3022", "Plate", 2, 2),
        ("3040", "Slope", 2, 1),
        ("3710", "Plate", 4, 2),
    ]

    if overwrite:
        col.delete_many({"partId": {"$in": [p[0] for p in samples]}})

    docs = []
    for partId, category, x, z in samples:
        docs.append({
            "partId": partId,
            "category": category,
            "bbox": {"x": x, "y": 1.2, "z": z},
            config.VECTOR_FIELD: rand_vec(config.EMBEDDING_DIMS),
        })

    res = col.insert_many(docs)
    return len(res.inserted_ids)


if __name__ == "__main__":
    n = seed_dummy_parts(overwrite=True)
    print(f"Inserted {n} docs into {config.MONGODB_DB}.{config.PARTS_COLLECTION}")
