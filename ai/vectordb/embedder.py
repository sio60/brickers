from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Iterable, Tuple

import torch
from transformers import AutoTokenizer, AutoModel
from pymongo import UpdateOne
from pymongo.collection import Collection

from ai import config
from ai.db import get_db


# =========================
# Config
# =========================
DEFAULT_MODEL = "intfloat/multilingual-e5-small"
EMBED_FIELD_PATH = "embedding.vector"


def get_parts_collection() -> Collection:
    return get_db()[config.PARTS_COLLECTION]


def sha1_text(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def build_embedding_text(doc: Dict) -> str:
    """
    임베딩 입력 텍스트(고정 규칙)
    - name/category/keywords + type 정보만 사용 (bbox는 임베딩에 넣지 않음)
    """
    name = (doc.get("name") or "").strip()
    category = (doc.get("category") or "").strip()
    part_type = (doc.get("partType") or "").strip()
    primitive_level = doc.get("primitiveLevel", None)

    kws = doc.get("keywords") or []
    if not isinstance(kws, list):
        kws = []

    # keyword는 너무 길어질 수 있어서 상한(예: 30개)
    kws = [str(k).strip() for k in kws if str(k).strip()]
    kws = kws[:30]

    bits: List[str] = []
    if name:
        bits.append(f"name: {name}")
    if category:
        bits.append(f"category: {category}")
    if part_type:
        bits.append(f"type: {part_type}")
    if primitive_level is not None:
        bits.append(f"primitiveLevel: {primitive_level}")
    if kws:
        bits.append("keywords: " + ", ".join(kws))

    # 텍스트가 비면 fallback
    text = " | ".join(bits).strip()
    if not text:
        text = f"partFile: {doc.get('partFile','')}".strip()

    # e5 계열은 passage/query prefix 권장
    # parts는 저장용이므로 passage로 통일
    return "passage: " + text


@dataclass
class HFEmbedder:
    model_name: str = DEFAULT_MODEL
    device: Optional[str] = None  # "cuda" or "cpu"
    batch_size: int = 64
    max_length: int = 256

    def __post_init__(self):
        if self.device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        # hidden size = embedding dims
        with torch.no_grad():
            dummy = self.tokenizer("passage: test", return_tensors="pt")
            dummy = {k: v.to(self.device) for k, v in dummy.items()}
            out = self.model(**dummy)
            self.dims = int(out.last_hidden_state.shape[-1])

    @staticmethod
    def _mean_pool(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
        summed = (last_hidden_state * mask).sum(dim=1)
        counts = mask.sum(dim=1).clamp(min=1e-9)
        return summed / counts

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            tok = self.tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=self.max_length,
                return_tensors="pt",
            )
            tok = {k: v.to(self.device) for k, v in tok.items()}

            with torch.no_grad():
                out = self.model(**tok)
                emb = self._mean_pool(out.last_hidden_state, tok["attention_mask"])
                emb = torch.nn.functional.normalize(emb, p=2, dim=1)  # cosine 유사도용

            emb_cpu = emb.detach().cpu().tolist()
            vectors.extend(emb_cpu)

        return vectors


def update_all_parts_embeddings(
    only_missing_or_changed: bool = True,
    model_name: Optional[str] = None,
    batch_size: int = 64,
    max_length: int = 256,
    mongo_bulk: int = 1000,
) -> Dict[str, int]:
    """
    DB의 partPath 목록 기반으로:
    - embedding이 없거나
    - embedding.textHash가 바뀐 것만
    배치 임베딩 후 ldraw_parts.embedding 서브도큐먼트 업데이트
    """
    col = get_parts_collection()
    model_name = model_name or getattr(config, "HF_EMBED_MODEL", None) or DEFAULT_MODEL

    embedder = HFEmbedder(model_name=model_name, batch_size=batch_size, max_length=max_length)

    # 필요한 필드만 가져오기
    proj = {
        "partPath": 1,
        "name": 1,
        "category": 1,
        "keywords": 1,
        "partType": 1,
        "primitiveLevel": 1,
        "updatedAt": 1,
        "sha1": 1,
        "embedding": 1,
        "partFile": 1,
    }

    cursor = col.find({}, proj)

    to_update: List[Tuple[str, str, str]] = []  # (partPath, text, textHash)
    scanned = 0

    for d in cursor:
        scanned += 1
        part_path = d.get("partPath")
        if not part_path:
            continue

        text = build_embedding_text(d)
        text_hash = sha1_text(text)

        emb = d.get("embedding") or {}
        old_hash = (emb.get("textHash") if isinstance(emb, dict) else None)
        has_vec = isinstance(emb, dict) and isinstance(emb.get("vector"), list) and len(emb.get("vector")) > 0

        if only_missing_or_changed:
            if (not has_vec) or (old_hash != text_hash):
                to_update.append((part_path, text, text_hash))
        else:
            to_update.append((part_path, text, text_hash))

    total_targets = len(to_update)
    if total_targets == 0:
        return {"scanned": scanned, "targets": 0, "updated": 0, "dims": embedder.dims}

    updated = 0
    ops: List[UpdateOne] = []

    print(f"[embed.scan] scanned={scanned}, targets={total_targets}, model={model_name}, dims={embedder.dims}")

    # 임베딩 배치 처리
    for i in range(0, total_targets, embedder.batch_size):
        chunk = to_update[i:i + embedder.batch_size]
        texts = [x[1] for x in chunk]
        vecs = embedder.embed_texts(texts)

        now = datetime.utcnow()

        for (part_path, _text, text_hash), vec in zip(chunk, vecs):
            ops.append(
                UpdateOne(
                    {"partPath": part_path},
                    {"$set": {
                        "embedding": {
                            "model": model_name,
                            "dims": embedder.dims,
                            "vector": vec,
                            "textHash": text_hash,
                            "updatedAt": now,
                        }
                    }},
                    upsert=False,
                )
            )

        if len(ops) >= mongo_bulk:
            col.bulk_write(ops, ordered=False)
            updated += len(ops)
            ops.clear()
            print(f"[embed.progress] {updated}/{total_targets}")

    if ops:
        col.bulk_write(ops, ordered=False)
        updated += len(ops)

    return {"scanned": scanned, "targets": total_targets, "updated": updated, "dims": embedder.dims}
