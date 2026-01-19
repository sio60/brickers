# ai/vectordb/bbox_calc.py
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from pymongo import UpdateOne
from pymongo.collection import Collection

from ai import config
from ai.db import get_db
from datetime import datetime


LDRAW_BASE = Path(r"C:\complete\ldraw")
PARTS_COLLECTION = config.PARTS_COLLECTION
ALIASES_COLLECTION = "ldraw_aliases"

BULK_SIZE = 1000


# -------------------------
# Basic bbox utils
# -------------------------
@dataclass
class BBox:
    minx: float = math.inf
    miny: float = math.inf
    minz: float = math.inf
    maxx: float = -math.inf
    maxy: float = -math.inf
    maxz: float = -math.inf

    def is_valid(self) -> bool:
        return self.minx <= self.maxx and self.miny <= self.maxy and self.minz <= self.maxz

    def include_point(self, x: float, y: float, z: float) -> None:
        self.minx = min(self.minx, x); self.miny = min(self.miny, y); self.minz = min(self.minz, z)
        self.maxx = max(self.maxx, x); self.maxy = max(self.maxy, y); self.maxz = max(self.maxz, z)

    def union(self, other: "BBox") -> None:
        if not other.is_valid():
            return
        self.include_point(other.minx, other.miny, other.minz)
        self.include_point(other.maxx, other.maxy, other.maxz)

    def corners(self) -> List[Tuple[float, float, float]]:
        return [
            (self.minx, self.miny, self.minz),
            (self.minx, self.miny, self.maxz),
            (self.minx, self.maxy, self.minz),
            (self.minx, self.maxy, self.maxz),
            (self.maxx, self.miny, self.minz),
            (self.maxx, self.miny, self.maxz),
            (self.maxx, self.maxy, self.minz),
            (self.maxx, self.maxy, self.maxz),
        ]

    def to_doc(self) -> Dict:
        dx = (self.maxx - self.minx) if self.is_valid() else 0.0
        dy = (self.maxy - self.miny) if self.is_valid() else 0.0
        dz = (self.maxz - self.minz) if self.is_valid() else 0.0
        return {
            "min": [self.minx, self.miny, self.minz],
            "max": [self.maxx, self.maxy, self.maxz],
            "size": [dx, dy, dz],
        }

    def volume(self) -> float:
        if not self.is_valid():
            return 0.0
        return (self.maxx - self.minx) * (self.maxy - self.miny) * (self.maxz - self.minz)


def _get_col(name: str) -> Collection:
    return get_db()[name]


def _norm_slash(s: str) -> str:
    return s.strip().replace("\\", "/").strip()


def _basename_lower(s: str) -> str:
    return _norm_slash(s).split("/")[-1].lower()


def _ensure_dat_ext(token: str) -> str:
    x = _basename_lower(token)
    if "." not in x:
        return x + ".dat"
    return x


# -------------------------
# Build resolve maps from DB
# -------------------------
def build_part_indexes() -> Tuple[Dict[str, List[str]], Set[str]]:
    """
    partFile -> [partPath...]
    all partPath set
    """
    col = _get_col(PARTS_COLLECTION)
    file_to_paths: Dict[str, List[str]] = {}
    all_paths: Set[str] = set()

    for d in col.find({}, {"partFile": 1, "partPath": 1}):
        pf = (d.get("partFile") or "").lower()
        pp = (d.get("partPath") or "").lower()
        if not pf or not pp:
            continue
        file_to_paths.setdefault(pf, []).append(pp)
        all_paths.add(pp)

    return file_to_paths, all_paths


def build_alias_file_map() -> Dict[str, str]:
    """
    fromFile -> toFile (파일명 기준)
    """
    col = _get_col(ALIASES_COLLECTION)
    mp: Dict[str, str] = {}
    for d in col.find({}, {"fromFile": 1, "toFile": 1, "from": 1, "to": 1}):
        frm = (d.get("fromFile") or d.get("from") or "").lower()
        to = (d.get("toFile") or d.get("to") or "").lower()
        if frm and to:
            mp[_ensure_dat_ext(frm)] = _ensure_dat_ext(to)
    return mp


def _choose_best_path(candidates: List[str]) -> Optional[str]:
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


def resolve_token_to_partpath(
    ref_token_raw: str,
    file_to_paths: Dict[str, List[str]],
    all_paths: Set[str],
    alias_map: Dict[str, str],
) -> Optional[str]:
    # """
    # LDraw type1 마지막 토큰(ref)을 partPath로 resolve
    # - s\xxx.dat, 48\xxx.dat, 8\xxx.dat 같은 힌트 우선
    # - 없으면 파일명으로 DB 매칭 + 우선순위 선택
    # - moved alias 적용
    # """
    token = _norm_slash(ref_token_raw).lower()

    # hint-based
    if token.startswith("48/"):
        guessed = f"p/48/{_ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed
    if token.startswith("8/"):
        guessed = f"p/8/{_ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed
    if token.startswith("s/"):
        guessed = f"parts/s/{_ensure_dat_ext(token)}"
        if guessed in all_paths:
            return guessed

    base_file = _ensure_dat_ext(token)
    if base_file in alias_map:
        base_file = alias_map[base_file]

    candidates = file_to_paths.get(base_file, [])
    return _choose_best_path(candidates)


# -------------------------
# Parse + recursive bbox
# -------------------------
@dataclass
class XForm:
    # 3x3 matrix + translation
    tx: float; ty: float; tz: float
    a: float; b: float; c: float
    d: float; e: float; f: float
    g: float; h: float; i: float


def _apply_xform_point(xf: XForm, x: float, y: float, z: float) -> Tuple[float, float, float]:
    # [a b c; d e f; g h i] * [x y z] + [tx ty tz]
    nx = xf.a * x + xf.b * y + xf.c * z + xf.tx
    ny = xf.d * x + xf.e * y + xf.f * z + xf.ty
    nz = xf.g * x + xf.h * y + xf.i * z + xf.tz
    return nx, ny, nz


def _transform_bbox(xf: XForm, child: BBox) -> BBox:
    out = BBox()
    if not child.is_valid():
        return out
    for (x, y, z) in child.corners():
        nx, ny, nz = _apply_xform_point(xf, x, y, z)
        out.include_point(nx, ny, nz)
    return out


def _parse_dat_for_bbox(
    file_path: Path,
) -> Tuple[BBox, List[Tuple[XForm, str]]]:
    """
    returns:
      - local geometry bbox from type3/type4 points
      - list of (transform, ref_token) from type1
    """
    bbox = BBox()
    refs: List[Tuple[XForm, str]] = []

    with file_path.open("r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue

            if line.startswith("1 "):
                toks = line.split()
                # 1 color x y z a b c d e f g h i file
                if len(toks) >= 15:
                    tx, ty, tz = float(toks[2]), float(toks[3]), float(toks[4])
                    a, b, c = float(toks[5]), float(toks[6]), float(toks[7])
                    d, e, f_ = float(toks[8]), float(toks[9]), float(toks[10])
                    g, h, i = float(toks[11]), float(toks[12]), float(toks[13])
                    ref = toks[14]
                    refs.append((XForm(tx, ty, tz, a, b, c, d, e, f_, g, h, i), ref))

            elif line.startswith("3 "):
                toks = line.split()
                # 3 color x1 y1 z1 x2 y2 z2 x3 y3 z3
                if len(toks) >= 11:
                    pts = [
                        (float(toks[2]), float(toks[3]), float(toks[4])),
                        (float(toks[5]), float(toks[6]), float(toks[7])),
                        (float(toks[8]), float(toks[9]), float(toks[10])),
                    ]
                    for x, y, z in pts:
                        bbox.include_point(x, y, z)

            elif line.startswith("4 "):
                toks = line.split()
                # 4 color x1 y1 z1 x2 y2 z2 x3 y3 z3 x4 y4 z4
                if len(toks) >= 14:
                    pts = [
                        (float(toks[2]), float(toks[3]), float(toks[4])),
                        (float(toks[5]), float(toks[6]), float(toks[7])),
                        (float(toks[8]), float(toks[9]), float(toks[10])),
                        (float(toks[11]), float(toks[12]), float(toks[13])),
                    ]
                    for x, y, z in pts:
                        bbox.include_point(x, y, z)

    return bbox, refs


def compute_bbox_recursive(
    part_path: str,
    file_to_paths: Dict[str, List[str]],
    all_paths: Set[str],
    alias_map: Dict[str, str],
    cache: Dict[str, BBox],
    visiting: Set[str],
) -> BBox:
    """
    partPath 기준 재귀 bbox 계산
    """
    pp = part_path.lower()

    if pp in cache:
        return cache[pp]

    if pp in visiting:
        # cycle guard
        return BBox()

    visiting.add(pp)

    fp = (LDRAW_BASE / pp)
    if not fp.exists():
        visiting.remove(pp)
        return BBox()

    local_bbox, type1_refs = _parse_dat_for_bbox(fp)

    # include referenced children
    for xf, ref_token in type1_refs:
        child_pp = resolve_token_to_partpath(ref_token, file_to_paths, all_paths, alias_map)
        if not child_pp:
            continue
        child_bbox = compute_bbox_recursive(child_pp, file_to_paths, all_paths, alias_map, cache, visiting)
        transformed = _transform_bbox(xf, child_bbox)
        local_bbox.union(transformed)

    visiting.remove(pp)
    cache[pp] = local_bbox
    return local_bbox


# -------------------------
# Bulk update into MongoDB
# -------------------------
def update_all_parts_bbox(
    only_missing_or_changed: bool = True,
    limit: Optional[int] = None,
) -> Dict[str, int]:
    """
    DB partPath 목록 기반으로 bbox/bboxVolume 업데이트
    - only_missing_or_changed=True: bboxSha1 != sha1 or bbox 없음인 문서만 계산
    """
    col = _get_col(PARTS_COLLECTION)

    file_to_paths, all_paths = build_part_indexes()
    alias_map = build_alias_file_map()

    query = {}
    proj = {"partPath": 1, "sha1": 1, "bboxSha1": 1, "bbox": 1}
    cursor = col.find(query, proj)

    cache: Dict[str, BBox] = {}
    ops: List[UpdateOne] = []

    scanned = 0
    updated = 0
    skipped = 0

    for d in cursor:
        scanned += 1
        if limit and scanned > limit:
            break

        part_path = (d.get("partPath") or "").lower()
        sha1 = d.get("sha1")
        bbox_sha1 = d.get("bboxSha1")
        has_bbox = d.get("bbox") is not None

        if only_missing_or_changed and sha1 and bbox_sha1 == sha1 and has_bbox:
            skipped += 1
            continue

        if not part_path:
            skipped += 1
            continue

        bbox = compute_bbox_recursive(
            part_path=part_path,
            file_to_paths=file_to_paths,
            all_paths=all_paths,
            alias_map=alias_map,
            cache=cache,
            visiting=set(),
        )

        doc_set = {
            "bbox": bbox.to_doc(),
            "bboxVolume": bbox.volume(),
            "bboxMode": "recursive",
            "bboxSha1": sha1,  # sha1과 동일하면 다음에 스킵 가능
            "bboxUpdatedAt": datetime.utcnow(),
        }

        ops.append(
            UpdateOne(
                {"partPath": part_path},
                {"$set": doc_set},
                upsert=False,
            )
        )
        updated += 1

        if len(ops) >= BULK_SIZE:
            col.bulk_write(ops, ordered=False)
            ops.clear()

        if scanned % 2000 == 0:
            print(f"[bbox.progress] scanned={scanned} updated={updated} skipped={skipped}")

    if ops:
        col.bulk_write(ops, ordered=False)

    return {"scanned": scanned, "updated": updated, "skipped": skipped}
