from __future__ import annotations

import re
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from pymongo import UpdateOne
from pymongo.collection import Collection

from ai import config
from ai.db import get_db


# ✅ 네 외부 폴더 경로
LDRAW_ROOT = Path(r"C:\complete\ldraw\parts")
ALLOWED_EXT = {".dat"}

BULK_SIZE = 1000  # 500~2000 추천


# ---- regex ----
MOVED_RE = re.compile(r"^0\s+~Moved\s+to\s+(\S+)", re.IGNORECASE)
ORG_RE = re.compile(r"^0\s+!LDRAW_ORG\s+(.+)$", re.IGNORECASE)
NAME_RE = re.compile(r"^0\s+Name:\s*(.+)$", re.IGNORECASE)
AUTHOR_RE = re.compile(r"^0\s+Author:\s*(.+)$", re.IGNORECASE)
CATEGORY_RE = re.compile(r"^0\s+!CATEGORY\s+(.+)$", re.IGNORECASE)
KEYWORDS_RE = re.compile(r"^0\s+!KEYWORDS\s+(.+)$", re.IGNORECASE)


def sha1_file(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_part_file(token: str) -> str:
    t = token.strip().replace("\\", "/")
    return t.split("/")[-1].lower()


def part_id_from_file(part_file: str) -> str:
    pf = normalize_part_file(part_file)
    return pf[:-4] if pf.endswith(".dat") else pf


def parse_keywords(s: str) -> List[str]:
    # KEYWORDS 라인이 보통 "a, b, c" 형태라서 콤마 split
    items = [x.strip() for x in s.split(",")]
    return [x for x in items if x]


def get_parts_collection() -> Collection:
    # ✅ 너희 .env에서 PARTS_COLLECTION=ldraw_parts 로 이미 맞춰둠
    return get_db()[config.PARTS_COLLECTION]


def get_aliases_collection() -> Collection:
    return get_db()["ldraw_aliases"]


def walk_files(root: Path) -> List[Path]:
    files: List[Path] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in ALLOWED_EXT:
            files.append(p)
    return files


def ingest() -> Dict[str, int]:
    if not LDRAW_ROOT.exists():
        raise RuntimeError(f"LDRAW_ROOT not found: {LDRAW_ROOT}")

    now = datetime.utcnow()
    files = walk_files(LDRAW_ROOT)
    print(f"[scan] {len(files)} dat files from {LDRAW_ROOT}")

    col_parts = get_parts_collection()
    col_alias = get_aliases_collection()

    ops_parts: List[UpdateOne] = []
    ops_alias: List[UpdateOne] = []
    moved_count = 0

    for idx, fp in enumerate(files, 1):
        part_file = fp.name.lower()
        part_id = part_id_from_file(part_file)

        org: Optional[str] = None
        name: Optional[str] = None
        author: Optional[str] = None
        category: Optional[str] = None
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
                        moved_to = normalize_part_file(m.group(1))

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

                # line type stats + refs
                if line.startswith("0 "):
                    stats["type0"] += 1
                elif line.startswith("1 "):
                    stats["type1"] += 1
                    toks = line.split()
                    if len(toks) >= 15:
                        refs.append(normalize_part_file(toks[-1]))
                elif line.startswith("2 "):
                    stats["type2"] += 1
                elif line.startswith("3 "):
                    stats["type3"] += 1
                elif line.startswith("4 "):
                    stats["type4"] += 1
                else:
                    stats["other"] += 1

        keywords = sorted(list(set([k for k in keywords if k])))
        refs = sorted(list(set(refs)))

        doc = {
            "partFile": part_file,
            "partId": part_id,
            "canonicalFile": moved_to or part_file,  # moved면 일단 to로 넣고, 최종 resolve는 aliases 기반으로 후처리 가능
            "org": org,
            "name": name,
            "author": author,
            "category": category,
            "keywords": keywords,
            "isRedirect": bool(moved_to),
            "movedTo": moved_to,
            "refs": refs,
            "stats": stats,
            "sha1": sha1_file(fp),
            "source": {"root": str(LDRAW_ROOT)},
            "updatedAt": now,
        }

        ops_parts.append(
            UpdateOne(
                {"partFile": part_file},
                {"$set": doc, "$setOnInsert": {"createdAt": now}},
                upsert=True,
            )
        )

        if moved_to:
            moved_count += 1
            ops_alias.append(
                UpdateOne(
                    {"from": part_file},
                    {"$set": {"from": part_file, "to": moved_to, "reason": "moved", "updatedAt": now},
                     "$setOnInsert": {"createdAt": now}},
                    upsert=True,
                )
            )

        # bulk flush
        if len(ops_parts) >= BULK_SIZE:
            col_parts.bulk_write(ops_parts, ordered=False)
            ops_parts.clear()

        if len(ops_alias) >= BULK_SIZE:
            col_alias.bulk_write(ops_alias, ordered=False)
            ops_alias.clear()

        if idx % 2000 == 0:
            print(f"[progress] {idx}/{len(files)}")

    if ops_parts:
        col_parts.bulk_write(ops_parts, ordered=False)
    if ops_alias:
        col_alias.bulk_write(ops_alias, ordered=False)

    return {"files": len(files), "moved": moved_count, "collection": f"{config.MONGODB_DB}.{config.PARTS_COLLECTION}"}


if __name__ == "__main__":
    summary = ingest()
    print("[done]", summary)
