"""
BOM (Bill of Materials) 생성기

LDR 파일 또는 BrickModel에서 부품 목록 추출
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ldr_converter import BrickModel, load_parts_db


# LDraw 색상 코드 → 이름 매핑
LDRAW_COLOR_NAMES = {
    0: "Black",
    1: "Blue",
    2: "Green",
    3: "Teal",
    4: "Red",
    5: "Dark Pink",
    6: "Brown",
    7: "Light Gray",
    8: "Dark Gray",
    9: "Light Blue",
    10: "Bright Green",
    11: "Light Teal",
    12: "Salmon",
    13: "Pink",
    14: "Yellow",
    15: "White",
    19: "Tan",
    25: "Orange",
    28: "Dark Green",
    70: "Reddish Brown",
    71: "Light Bluish Gray",
    72: "Dark Bluish Gray",
    89: "Dark Purple",
}


@dataclass
class BomEntry:
    """BOM 항목"""
    part_id: str        # 파츠 ID (예: "3024")
    part_name: str      # 파츠 이름 (예: "1x1 Plate")
    color_code: int     # 색상 코드
    color_name: str     # 색상 이름
    count: int          # 개수
    ldraw_file: str     # LDraw 파일명


@dataclass
class BomReport:
    """BOM 리포트"""
    model_name: str
    total_parts: int
    unique_parts: int
    entries: List[BomEntry]
    color_summary: Dict[str, int]
    part_summary: Dict[str, int]


def get_color_name(color_code: int) -> str:
    """색상 코드 → 이름"""
    return LDRAW_COLOR_NAMES.get(color_code, f"Color_{color_code}")


def extract_bom_from_model(model: BrickModel, parts_db: Dict) -> BomReport:
    """
    BrickModel에서 BOM 추출
    """
    # (part_id, color_code) 별로 카운트
    counter = Counter()
    for brick in model.bricks:
        key = (brick.part_id, brick.color_code)
        counter[key] += 1

    entries = []
    color_summary = Counter()
    part_summary = Counter()

    for (part_id, color_code), count in counter.items():
        part_info = parts_db.get(part_id, {})
        part_name = part_info.get('name', f'Unknown ({part_id})')
        ldraw_file = part_info.get('ldrawFile', f'{part_id}.dat')
        color_name = get_color_name(color_code)

        entry = BomEntry(
            part_id=part_id,
            part_name=part_name,
            color_code=color_code,
            color_name=color_name,
            count=count,
            ldraw_file=ldraw_file
        )
        entries.append(entry)

        color_summary[color_name] += count
        part_summary[part_name] += count

    # 정렬 (파츠 이름 → 색상 순)
    entries.sort(key=lambda e: (e.part_name, e.color_name))

    return BomReport(
        model_name=model.name,
        total_parts=sum(counter.values()),
        unique_parts=len(entries),
        entries=entries,
        color_summary=dict(color_summary),
        part_summary=dict(part_summary)
    )


def extract_bom_from_ldr(ldr_path: str, parts_db: Dict) -> BomReport:
    """
    LDR 파일에서 BOM 추출
    """
    path = Path(ldr_path)
    if not path.exists():
        raise FileNotFoundError(f"LDR not found: {path}")

    # (part_file, color_code) 별로 카운트
    counter = Counter()
    model_name = path.stem

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()

            # 모델 이름 추출
            if line.startswith("0 ") and not line.startswith("0 //"):
                if "Name:" not in line and "Author:" not in line:
                    model_name = line[2:].strip() or model_name

            # Type 1 라인 (브릭 배치)
            if not line.startswith("1 "):
                continue

            tokens = line.split()
            if len(tokens) < 15:
                continue

            try:
                color_code = int(tokens[1])
            except ValueError:
                continue

            part_file = tokens[-1].lower().replace("\\", "/").split("/")[-1]
            key = (part_file, color_code)
            counter[key] += 1

    # part_file → part_id 역매핑
    file_to_id = {}
    for part_id, info in parts_db.items():
        ldraw_file = info.get('ldrawFile', '').lower()
        file_to_id[ldraw_file] = part_id

    entries = []
    color_summary = Counter()
    part_summary = Counter()

    for (part_file, color_code), count in counter.items():
        part_id = file_to_id.get(part_file, part_file.replace('.dat', ''))
        part_info = parts_db.get(part_id, {})
        part_name = part_info.get('name', f'Unknown ({part_file})')
        color_name = get_color_name(color_code)

        entry = BomEntry(
            part_id=part_id,
            part_name=part_name,
            color_code=color_code,
            color_name=color_name,
            count=count,
            ldraw_file=part_file
        )
        entries.append(entry)

        color_summary[color_name] += count
        part_summary[part_name] += count

    entries.sort(key=lambda e: (e.part_name, e.color_name))

    return BomReport(
        model_name=model_name,
        total_parts=sum(counter.values()),
        unique_parts=len(entries),
        entries=entries,
        color_summary=dict(color_summary),
        part_summary=dict(part_summary)
    )


def format_bom_text(report: BomReport) -> str:
    """BOM을 텍스트로 포맷"""
    lines = []
    lines.append("=" * 50)
    lines.append(f"BOM: {report.model_name}")
    lines.append("=" * 50)
    lines.append(f"총 부품 수: {report.total_parts}개")
    lines.append(f"부품 종류: {report.unique_parts}종")
    lines.append("")

    # 부품 목록
    lines.append("[부품 목록]")
    lines.append("-" * 50)
    for entry in report.entries:
        lines.append(f"  {entry.part_name} ({entry.color_name}): {entry.count}개")
    lines.append("")

    # 색상별 요약
    lines.append("[색상별 요약]")
    lines.append("-" * 50)
    for color, count in sorted(report.color_summary.items(), key=lambda x: -x[1]):
        lines.append(f"  {color}: {count}개")
    lines.append("")

    # 파츠별 요약
    lines.append("[파츠별 요약]")
    lines.append("-" * 50)
    for part, count in sorted(report.part_summary.items(), key=lambda x: -x[1]):
        lines.append(f"  {part}: {count}개")

    lines.append("=" * 50)

    return "\n".join(lines)


def format_bom_json(report: BomReport) -> str:
    """BOM을 JSON으로 포맷"""
    data = {
        "model_name": report.model_name,
        "total_parts": report.total_parts,
        "unique_parts": report.unique_parts,
        "entries": [asdict(e) for e in report.entries],
        "color_summary": report.color_summary,
        "part_summary": report.part_summary,
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def save_bom(report: BomReport, output_path: str, format: str = "text"):
    """BOM 저장"""
    if format == "json":
        content = format_bom_json(report)
    else:
        content = format_bom_text(report)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"BOM 저장: {output_path}")


def main():
    # 파츠 DB 로드
    docs_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docs')
    parts_db_path = os.path.join(docs_path, 'BrickParts_Database.json')
    parts_db = load_parts_db(parts_db_path)
    print(f"파츠 DB: {len(parts_db)}개")

    output_dir = os.path.join(os.path.dirname(__file__), 'output')

    # 포르쉐 LDR에서 BOM 추출
    ldr_files = ['포르쉐.ldr', 'heart.ldr', 'smiley.ldr']

    for ldr_file in ldr_files:
        ldr_path = os.path.join(output_dir, ldr_file)
        if not os.path.exists(ldr_path):
            print(f"파일 없음: {ldr_file}")
            continue

        print(f"\n{'='*50}")
        print(f"BOM 추출: {ldr_file}")

        report = extract_bom_from_ldr(ldr_path, parts_db)

        # 텍스트 출력
        print(format_bom_text(report))

        # 파일 저장
        bom_txt_path = os.path.join(output_dir, ldr_file.replace('.ldr', '_bom.txt'))
        bom_json_path = os.path.join(output_dir, ldr_file.replace('.ldr', '_bom.json'))

        save_bom(report, bom_txt_path, format="text")
        save_bom(report, bom_json_path, format="json")


if __name__ == "__main__":
    main()
