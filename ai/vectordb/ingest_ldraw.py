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
    """
    ✅ 중복 방지용 유니크 인덱스 생성
    - 컬렉션 비운 상태에서 먼저 생성하면 가장 깔끔함
    - 이미 존재하면 그대로 넘어감
    """
    col_parts = get_col(PARTS_COLLECTION)
    col_models = get_col(MODELS_COLLECTION)
    col_alias = get_col(ALIASES_COLLECTION)

    # parts: partPath 유니크
    col_parts.create_index([("partPath", ASCENDING)], unique=True, name="uq_partPath")

    # models: modelPath 유니크
    col_models.create_index([("modelPath", ASCENDING)], unique=True, name="uq_modelPath")

    # aliases: fromPath 유니크
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
    """
    movedTo, refs 토큰이 '8\\stud12' 처럼 .dat가 없을 때 보정
    """
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
    """
    parts/xxx.dat        -> part
    parts/s/xxx.dat      -> subpart
    p/xxx.dat            -> primitive
    p/8/xxx.dat          -> primitive(level=8)
    p/48/xxx.dat         -> primitive(level=48)
    """
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
    """
    returns (filepath, partPath)
    partPath 기준으로 upsert => 폴더별 중복 덮어쓰기 방지
    """
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
                    moved_to = ensure_dat_ext(m.group(1))  # ✅ .dat 보정

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

        # ✅ 항상 upsert + update
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
# Resolve indexes for models
# =========================
def build_part_indexes() -> Tuple[Dict[str, List[str]], Set[str]]:
    col_parts = get_col(PARTS_COLLECTION)
    file_to_paths: Dict[str, List[str]] = {}
    all_paths: Set[str] = set()

    cursor = col_parts.find({}, {"partFile": 1, "partPath": 1})
    for d in cursor:
        pf = (d.get("partFile") or "").lower()
        pp = (d.get("partPath") or "").lower()
        if not pf or not pp:
            continue
        file_to_paths.setdefault(pf, []).append(pp)
        all_paths.add(pp)

    return file_to_paths, all_paths


def build_alias_file_map() -> Dict[str, str]:
    col_alias = get_col(ALIASES_COLLECTION)
    mp: Dict[str, str] = {}
    cursor = col_alias.find({}, {"fromFile": 1, "toFile": 1, "from": 1, "to": 1})
    for d in cursor:
        frm = (d.get("fromFile") or d.get("from") or "").lower()
        to = (d.get("toFile") or d.get("to") or "").lower()
        if frm and to:
            mp[ensure_dat_ext(frm)] = ensure_dat_ext(to)
    return mp


def choose_best_path(candidates: List[str]) -> Optional[str]:
    if not candidates:
        return None

    def rank(p: str) -> int:
        if p.startswith("parts/") and not p.startswith("parts/s/"):
            return 1
        if p.startswith("parts/s/"):
            return 2
        if p.startswith("p/48/"):
            return 3
        if p.startswith("p/8/"):
            return 4
        if p.startswith("p/"):
            return 5
        return 99

    return sorted(candidates, key=rank)[0]


def resolve_ref_to_partpath(
    ref_token_raw: str,
    file_to_paths: Dict[str, List[str]],
    all_paths: Set[str],
    alias_map: Dict[str, str],
) -> Tuple[Optional[str], str]:
    token = norm_slash(ref_token_raw).lower()

    if token.startswith("48/"):
        guessed = f"p/48/{ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed, "hint:48"
    if token.startswith("8/"):
        guessed = f"p/8/{ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed, "hint:8"
    if token.startswith("s/"):
        guessed = f"parts/s/{ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed, "hint:s"

    base_file = ensure_dat_ext(token)
    if base_file in alias_map:
        base_file = alias_map[base_file]

    candidates = file_to_paths.get(base_file, [])
    chosen = choose_best_path(candidates)
    if chosen:
        return chosen, "byFile"

    return None, "notFound"


# =========================
# Models ingest
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

    file_to_paths, all_paths = build_part_indexes()
    alias_map = build_alias_file_map()

    ops: List[UpdateOne] = []
    print(f"[models.scan] {len(files)} files")

    for idx, (fp, model_path) in enumerate(files, 1):
        parsed = parse_model_ldr(fp)

        resolved_bom: Dict[str, int] = {}
        missing: List[Dict[str, str]] = []
        resolve_map: List[Dict[str, str]] = []

        for tok in parsed["refTokens"]:
            resolved, reason = resolve_ref_to_partpath(tok, file_to_paths, all_paths, alias_map)
            if resolved:
                resolved_bom[resolved] = resolved_bom.get(resolved, 0) + 1
                resolve_map.append({"ref": norm_slash(tok), "resolved": resolved, "reason": reason})
            else:
                missing.append({"ref": norm_slash(tok), "reason": reason})

        doc = {
            "modelPath": model_path,
            "modelFile": fp.name,
            "ext": fp.suffix.lower(),

            "refTokens": [norm_slash(x) for x in parsed["refTokens"]],
            "resolvedBOM": resolved_bom,
            "missingParts": missing,
            "resolveMap": resolve_map,

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
def ingest_all(store_model_text: bool = False) -> Dict[str, Dict[str, int]]:
    parts = ingest_parts()
    models = ingest_models(store_text=store_model_text)
    return {"parts": parts, "models": models}


if __name__ == "__main__":
    # ✅ 컬렉션 비운 상태라면 실행 전에 인덱스부터 만들어두기
    ensure_indexes()

    summary = ingest_all(store_model_text=False)
    print("[done]", summary)
