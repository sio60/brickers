import random
import config
from db import get_parts_collection
from vectordb.search import parts_vector_search


def rand_vec(dims: int):
    return [random.uniform(-1, 1) for _ in range(dims)]


def main():
    col = get_parts_collection()
    q = rand_vec(config.EMBEDDING_DIMS)

    hits = parts_vector_search(
        col=col,
        query_vector=q,
        limit=5,
        num_candidates=200,
        filters={"category": ["Brick", "Plate", "Slope"]},
    )

    print("HITS:")
    for h in hits:
        print(h)


if __name__ == "__main__":
    main()
