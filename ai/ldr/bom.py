from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Dict


@dataclass(frozen=True)
class BomKey:
    part: str   # 예: 3001.dat
    color: int  # LDraw color code


def normalize_part(token: str) -> str:
    t = token.strip().replace("\\", "/")
    return t.split("/")[-1].lower()


def parse_ldr_bom(ldr_path: str | Path) -> Dict[BomKey, int]:
    """
    Type-1 line:
    1 <color> x y z a b c d e f g h i <part.dat>
    """
    path = Path(ldr_path)
    if not path.exists():
        raise FileNotFoundError(f"LDR not found: {path}")

    bom: Dict[BomKey, int] = {}

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("1 "):
                continue

            tokens = line.split()
            if len(tokens) < 15:
                continue

            try:
                color = int(tokens[1])
            except ValueError:
                continue

            part = normalize_part(tokens[-1])
            key = BomKey(part=part, color=color)
            bom[key] = bom.get(key, 0) + 1

    return bom
