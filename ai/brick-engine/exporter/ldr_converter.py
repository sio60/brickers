"""
LDR Converter - JSON BrickModel을 LDraw 포맷(.ldr)으로 변환

작성자: 성빈
작성일: 2026-01-14

LDraw 스펙 참고: docs/LDraw_Reference.md
"""

import json
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime


# ============================================
# 데이터 타입 정의
# ============================================

@dataclass
class Vector3:
    x: float
    y: float
    z: float


@dataclass
class PlacedBrick:
    id: str
    part_id: str
    position: Vector3
    rotation: int  # 0, 90, 180, 270
    color_code: int
    layer: int


@dataclass
class BrickModel:
    model_id: str
    name: str
    mode: str  # 'adult' or 'kids'
    bricks: List[PlacedBrick]
    target_age: Optional[str] = None
    created_at: Optional[str] = None


# ============================================
# 회전 행렬 (Y축 기준)
# ============================================

# LDraw는 -Y가 위쪽인 오른손 좌표계
# 회전 행렬: 3x3 = [a b c / d e f / g h i]
ROTATION_MATRICES = {
    0:   [1, 0, 0, 0, 1, 0, 0, 0, 1],      # 회전 없음
    90:  [0, 0, -1, 0, 1, 0, 1, 0, 0],     # Y축 90도
    180: [-1, 0, 0, 0, 1, 0, 0, 0, -1],    # Y축 180도
    270: [0, 0, 1, 0, 1, 0, -1, 0, 0],     # Y축 270도
}


def get_rotation_matrix(rotation: int) -> List[int]:
    """회전 각도(0, 90, 180, 270)에 해당하는 3x3 행렬 반환"""
    return ROTATION_MATRICES.get(rotation, ROTATION_MATRICES[0])


# ============================================
# LDR 변환 함수
# ============================================

def brick_to_ldr_line(brick: PlacedBrick, parts_db: Dict) -> str:
    """
    PlacedBrick을 LDR Line Type 1 형식으로 변환

    형식: 1 <색상> <x> <y> <z> <a> <b> <c> <d> <e> <f> <g> <h> <i> <파일명>
    """
    # 파츠 정보 조회
    part_info = parts_db.get(brick.part_id)
    if not part_info:
        raise ValueError(f"Unknown part ID: {brick.part_id}")

    ldraw_file = part_info['ldrawFile']

    # 회전 행렬
    matrix = get_rotation_matrix(brick.rotation)

    # LDR 라인 생성
    # 좌표는 이미 LDU 단위로 들어온다고 가정
    line = f"1 {brick.color_code} {brick.position.x:.0f} {brick.position.y:.0f} {brick.position.z:.0f} "
    line += " ".join(str(m) for m in matrix)
    line += f" {ldraw_file}"

    return line


def model_to_ldr(model: BrickModel, parts_db: Dict) -> str:
    """
    BrickModel 전체를 LDR 파일 내용으로 변환
    """
    lines = []

    # 헤더 주석
    lines.append(f"0 {model.name}")
    lines.append(f"0 Name: {model.model_id}.ldr")
    lines.append(f"0 Author: Brick CoScientist")
    lines.append(f"0 Mode: {model.mode}")
    if model.target_age:
        lines.append(f"0 TargetAge: {model.target_age}")
    lines.append(f"0 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")  # 빈 줄

    # 레이어별로 정렬 (아래부터 위로)
    sorted_bricks = sorted(model.bricks, key=lambda b: b.layer)

    current_layer = -1
    for brick in sorted_bricks:
        # 레이어 변경 시 주석 추가
        if brick.layer != current_layer:
            current_layer = brick.layer
            lines.append(f"0 // Layer {current_layer}")

        # 브릭 라인 추가
        ldr_line = brick_to_ldr_line(brick, parts_db)
        lines.append(ldr_line)

    return "\n".join(lines)


def save_ldr_file(content: str, filepath: str):
    """LDR 파일 저장"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"LDR 파일 저장 완료: {filepath}")


# ============================================
# JSON 파싱 헬퍼
# ============================================

def load_parts_db(filepath: str) -> Dict:
    """BrickParts_Database.json 로드 후 partId로 인덱싱"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # partId를 키로 하는 딕셔너리 생성
    parts_dict = {}
    for part in data['parts']:
        parts_dict[part['partId']] = part

    return parts_dict


def parse_brick_model(json_data: dict) -> BrickModel:
    """JSON 딕셔너리를 BrickModel로 변환"""
    bricks = []
    for b in json_data.get('bricks', []):
        pos = b['position']
        brick = PlacedBrick(
            id=b['id'],
            part_id=b['partId'],
            position=Vector3(x=pos['x'], y=pos['y'], z=pos['z']),
            rotation=b['rotation'],
            color_code=b['colorCode'],
            layer=b['layer']
        )
        bricks.append(brick)

    return BrickModel(
        model_id=json_data['modelId'],
        name=json_data['name'],
        mode=json_data['mode'],
        bricks=bricks,
        target_age=json_data.get('targetAge'),
        created_at=json_data.get('createdAt')
    )


# ============================================
# 메인 실행
# ============================================

if __name__ == "__main__":
    print("LDR Converter 모듈 로드 완료")
    print("사용법: from ldr_converter import model_to_ldr, load_parts_db")
