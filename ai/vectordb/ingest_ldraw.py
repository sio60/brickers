# ai/vectordb/ingest_ldraw.py
from __future__ import annotations

import re
import hashlib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set

from pymongo import UpdateOne, ASCENDING
from pymongo.collection import Collection

from ai import config
from ai.db import get_db

# ✅ bbox 계산 모듈 import
from ai.vectordb.bbox_calc import update_all_parts_bbox



# =========================
# Config
# =========================
LDRAW_BASE = Path(r"C:\complete\ldraw")

PARTS_COLLECTION = config.PARTS_COLLECTION      # e.g. ldraw_parts
ALIASES_COLLECTION = "ldraw_aliases"
MODELS_COLLECTION = "ldraw_models"

BULK_SIZE = 1000
ALLOWED_PART_EXT = {".dat"}
ALLOWED_MODEL_EXT = {".ldr"}  # models는 보통 .ldr 중심


# =========================
# Regex
# =========================
MOVED_RE = re.compile(r"^0\s+~Moved\s+to\s+(\S+)", re.IGNORECASE)
ORG_RE = re.compile(r"^0\s+!LDRAW_ORG\s+(.+)$", re.IGNORECASE)
NAME_RE = re.compile(r"^0\s+Name:\s*(.+)$", re.IGNORECASE)
AUTHOR_RE = re.compile(r"^0\s+Author:\s*(.+)$", re.IGNORECASE)
CATEGORY_RE = re.compile(r"^0\s+!CATEGORY\s+(.+)$", re.IGNORECASE)
KEYWORDS_RE = re.compile(r"^0\s+!KEYWORDS\s+(.+)$", re.IGNORECASE)


# =========================
# DB / Helpers
# =========================
def get_col(name: str) -> Collection:
    return get_db()[name]


def ensure_indexes() -> None:
    col_parts = get_col(PARTS_COLLECTION)
    col_models = get_col(MODELS_COLLECTION)
    col_alias = get_col(ALIASES_COLLECTION)

    col_parts.create_index([("partPath", ASCENDING)], unique=True, name="uq_partPath")
    col_models.create_index([("modelPath", ASCENDING)], unique=True, name="uq_modelPath")
    col_alias.create_index([("fromPath", ASCENDING)], unique=True, name="uq_fromPath")


def sha1_file(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def norm_slash(s: str) -> str:
    return s.strip().replace("\\", "/").strip()


def basename_lower(s: str) -> str:
    return norm_slash(s).split("/")[-1].lower()


def ensure_dat_ext(name_or_path: str) -> str:
    x = basename_lower(name_or_path)
    if "." not in x:
        return x + ".dat"
    return x


def relpath_lower(p: Path) -> str:
    return p.relative_to(LDRAW_BASE).as_posix().lower()


def parse_keywords(s: str) -> List[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


def part_id_from_file(part_file: str) -> str:
    pf = basename_lower(part_file)
    return pf[:-4] if pf.endswith(".dat") else pf


@dataclass
class PartKind:
    partType: str
    primitiveLevel: Optional[int]


def classify_part(part_path: str) -> PartKind:
    pp = part_path.lower()
    if pp.startswith("parts/s/"):
        return PartKind("subpart", None)
    if pp.startswith("p/48/"):
        return PartKind("primitive", 48)
    if pp.startswith("p/8/"):
        return PartKind("primitive", 8)
    if pp.startswith("p/"):
        return PartKind("primitive", None)
    return PartKind("part", None)


def walk_files(root: Path, exts: Set[str]) -> List[Path]:
    if not root.exists():
        return []
    out: List[Path] = []
    for fp in root.rglob("*"):
        if fp.is_file() and fp.suffix.lower() in exts:
            out.append(fp)
    return out


# =========================
# Parts ingest
# =========================
def scan_parts_files() -> List[Tuple[Path, str]]:
    roots = [LDRAW_BASE / "parts", LDRAW_BASE / "p"]
    pairs: List[Tuple[Path, str]] = []
    for r in roots:
        for fp in walk_files(r, ALLOWED_PART_EXT):
            pairs.append((fp, relpath_lower(fp)))
    return pairs


def parse_part_dat(fp: Path) -> Dict:
    org = name = author = category = None
    keywords: List[str] = []
    moved_to: Optional[str] = None
    refs: List[str] = []

    stats = {"lines": 0, "type0": 0, "type1": 0, "type2": 0, "type3": 0, "type4": 0, "other": 0}

    with fp.open("r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            stats["lines"] += 1

            if moved_to is None:
                m = MOVED_RE.match(line)
                if m:
                    moved_to = ensure_dat_ext(m.group(1))

            if org is None:
                m = ORG_RE.match(line)
                if m:
                    org = m.group(1).strip()

            if name is None:
                m = NAME_RE.match(line)
                if m:
                    name = m.group(1).strip()

            if author is None:
                m = AUTHOR_RE.match(line)
                if m:
                    author = m.group(1).strip()

            if category is None:
                m = CATEGORY_RE.match(line)
                if m:
                    category = m.group(1).strip()

            m = KEYWORDS_RE.match(line)
            if m:
                keywords.extend(parse_keywords(m.group(1)))

            if line.startswith("0 "):
                stats["type0"] += 1
            elif line.startswith("1 "):
                stats["type1"] += 1
                toks = line.split()
                if len(toks) >= 15:
                    refs.append(ensure_dat_ext(toks[-1]))
            elif line.startswith("2 "):
                stats["type2"] += 1
            elif line.startswith("3 "):
                stats["type3"] += 1
            elif line.startswith("4 "):
                stats["type4"] += 1
            else:
                stats["other"] += 1

    return {
        "org": org,
        "name": name,
        "author": author,
        "category": category,
        "keywords": sorted(set([k for k in keywords if k])),
        "movedTo": moved_to,
        "refs": sorted(set(refs)),
        "stats": stats,
    }


def ingest_parts() -> Dict[str, int]:
    now = datetime.utcnow()
    files = scan_parts_files()
    if not files:
        raise RuntimeError("No parts .dat found under parts/ or p/")

    col_parts = get_col(PARTS_COLLECTION)
    col_alias = get_col(ALIASES_COLLECTION)

    ops_parts: List[UpdateOne] = []
    ops_alias: List[UpdateOne] = []
    moved_count = 0

    print(f"[parts.scan] {len(files)} files")

    for idx, (fp, part_path) in enumerate(files, 1):
        part_file = fp.name.lower()
        part_id = part_id_from_file(part_file)
        kind = classify_part(part_path)

        parsed = parse_part_dat(fp)
        moved_to = parsed["movedTo"]

        doc = {
            "partPath": part_path,
            "partFile": part_file,
            "partId": part_id,

            "partType": kind.partType,
            "primitiveLevel": kind.primitiveLevel,

            "org": parsed["org"],
            "name": parsed["name"],
            "author": parsed["author"],
            "category": parsed["category"],
            "keywords": parsed["keywords"],

            "isRedirect": bool(moved_to),
            "movedTo": moved_to,
            "canonicalFile": moved_to or part_file,

            "refs": parsed["refs"],
            "stats": parsed["stats"],

            "sha1": sha1_file(fp),
            "source": {"base": str(LDRAW_BASE), "file": str(fp)},
            "updatedAt": now,
        }

        ops_parts.append(
            UpdateOne(
                {"partPath": part_path},
                {"$set": doc, "$setOnInsert": {"createdAt": now}},
                upsert=True,
            )
        )

        if moved_to:
            moved_count += 1
            ops_alias.append(
                UpdateOne(
                    {"fromPath": part_path},
                    {
                        "$set": {
                            "fromPath": part_path,
                            "fromFile": part_file,
                            "toFile": moved_to,
                            "reason": "moved",
                            "updatedAt": now,
                        },
                        "$setOnInsert": {"createdAt": now},
                    },
                    upsert=True,
                )
            )

        if len(ops_parts) >= BULK_SIZE:
            col_parts.bulk_write(ops_parts, ordered=False)
            ops_parts.clear()

        if len(ops_alias) >= BULK_SIZE:
            col_alias.bulk_write(ops_alias, ordered=False)
            ops_alias.clear()

        if idx % 2000 == 0:
            print(f"[parts.progress] {idx}/{len(files)}")

    if ops_parts:
        col_parts.bulk_write(ops_parts, ordered=False)
    if ops_alias:
        col_alias.bulk_write(ops_alias, ordered=False)

    return {"files": len(files), "moved": moved_count}


# =========================
# Models ingest (기존 그대로)
# =========================
def scan_model_files() -> List[Tuple[Path, str]]:
    root = LDRAW_BASE / "models"
    pairs: List[Tuple[Path, str]] = []
    for fp in walk_files(root, ALLOWED_MODEL_EXT):
        pairs.append((fp, relpath_lower(fp)))
    return pairs


def parse_model_ldr(fp: Path) -> Dict:
    ref_tokens: List[str] = []
    stats = {"lines": 0, "type0": 0, "type1": 0, "type2": 0, "type3": 0, "type4": 0, "other": 0}

    with fp.open("r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            stats["lines"] += 1

            if line.startswith("0 "):
                stats["type0"] += 1
            elif line.startswith("1 "):
                stats["type1"] += 1
                toks = line.split()
                if len(toks) >= 15:
                    ref_tokens.append(toks[-1])
            elif line.startswith("2 "):
                stats["type2"] += 1
            elif line.startswith("3 "):
                stats["type3"] += 1
            elif line.startswith("4 "):
                stats["type4"] += 1
            else:
                stats["other"] += 1

    return {"refTokens": ref_tokens, "stats": stats}


def ingest_models(store_text: bool = False) -> Dict[str, int]:
    now = datetime.utcnow()
    files = scan_model_files()
    if not files:
        print("[models.scan] no model files found, skip.")
        return {"files": 0}

    col_models = get_col(MODELS_COLLECTION)
    ops: List[UpdateOne] = []

    print(f"[models.scan] {len(files)} files")

    for idx, (fp, model_path) in enumerate(files, 1):
        parsed = parse_model_ldr(fp)

        doc = {
            "modelPath": model_path,
            "modelFile": fp.name,
            "ext": fp.suffix.lower(),
            "refTokens": [norm_slash(x) for x in parsed["refTokens"]],
            "stats": parsed["stats"],
            "sha1": sha1_file(fp),
            "source": {"base": str(LDRAW_BASE), "file": str(fp)},
            "updatedAt": now,
        }
        if store_text:
            doc["text"] = fp.read_text(encoding="utf-8", errors="ignore")

        ops.append(
            UpdateOne(
                {"modelPath": model_path},
                {"$set": doc, "$setOnInsert": {"createdAt": now}},
                upsert=True,
            )
        )

        if len(ops) >= BULK_SIZE:
            col_models.bulk_write(ops, ordered=False)
            ops.clear()

        if idx % 200 == 0:
            print(f"[models.progress] {idx}/{len(files)}")

    if ops:
        col_models.bulk_write(ops, ordered=False)

    return {"files": len(files)}


# =========================
# Main
# =========================
def ingest_all(store_model_text: bool = False, compute_bbox: bool = True) -> Dict:
    parts = ingest_parts()
    models = ingest_models(store_text=store_model_text)

    bbox_summary = None
    if compute_bbox:
        # ✅ sha1 동일 + bbox 존재하면 자동 스킵
        bbox_summary = update_all_parts_bbox(only_missing_or_changed=True)

    return {"parts": parts, "models": models, "bbox": bbox_summary}


if __name__ == "__main__":
    ensure_indexes()
    summary = ingest_all(store_model_text=False, compute_bbox=True)
    print("[done]", summary)
