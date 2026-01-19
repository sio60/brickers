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
    mode: str  # 'pro' or 'kids'
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
# L1 검증 (스키마/타입)
# ============================================

class ValidationError(Exception):
    """검증 실패 시 발생하는 예외"""
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {errors}")


# LDraw 색상 코드 범위 (0-511, 일반적으로 사용되는 범위)
VALID_COLOR_RANGE = (0, 511)
VALID_ROTATIONS = [0, 90, 180, 270]


def validate_brick(brick: PlacedBrick, parts_db: Dict) -> List[str]:
    """
    개별 브릭의 L1 검증 (스키마/타입)

    Returns:
        에러 메시지 리스트 (빈 리스트면 검증 통과)
    """
    errors = []

    # 1. part_id 존재 여부
    if brick.part_id not in parts_db:
        errors.append(f"[{brick.id}] Unknown part_id: '{brick.part_id}'")

    # 2. rotation 범위 (0, 90, 180, 270만 허용)
    if brick.rotation not in VALID_ROTATIONS:
        errors.append(
            f"[{brick.id}] Invalid rotation: {brick.rotation}, "
            f"must be one of {VALID_ROTATIONS}"
        )

    # 3. color_code 범위 (LDraw 표준: 0-511)
    if not (VALID_COLOR_RANGE[0] <= brick.color_code <= VALID_COLOR_RANGE[1]):
        errors.append(
            f"[{brick.id}] Invalid color_code: {brick.color_code}, "
            f"must be {VALID_COLOR_RANGE[0]}-{VALID_COLOR_RANGE[1]}"
        )

    # 4. layer 음수 체크
    if brick.layer < 0:
        errors.append(f"[{brick.id}] Invalid layer: {brick.layer}, must be >= 0")

    # 5. id 빈 문자열 체크
    if not brick.id or not brick.id.strip():
        errors.append("Brick has empty id")

    return errors


def validate_model(model: BrickModel, parts_db: Dict) -> List[str]:
    """
    BrickModel 전체의 L1 검증

    Returns:
        에러 메시지 리스트 (빈 리스트면 검증 통과)
    """
    errors = []

    # 1. 모델 기본 필드 검증
    if not model.model_id or not model.model_id.strip():
        errors.append("Model has empty model_id")

    if not model.name or not model.name.strip():
        errors.append("Model has empty name")

    if model.mode not in ['pro', 'kids']:
        errors.append(f"Invalid mode: '{model.mode}', must be 'pro' or 'kids'")

    # 2. kids 모드일 때 target_age 검증
    if model.mode == 'kids':
        valid_ages = ['4-6', '7-9', '10-12']
        if model.target_age not in valid_ages:
            errors.append(
                f"Kids mode requires target_age: {valid_ages}, "
                f"got '{model.target_age}'"
            )

    # 3. 브릭 리스트 검증
    if not model.bricks:
        errors.append("Model has no bricks")

    # 4. 개별 브릭 검증
    brick_ids = set()
    for brick in model.bricks:
        # 중복 ID 체크
        if brick.id in brick_ids:
            errors.append(f"Duplicate brick id: '{brick.id}'")
        brick_ids.add(brick.id)

        # 개별 브릭 검증
        brick_errors = validate_brick(brick, parts_db)
        errors.extend(brick_errors)

    return errors


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


# STEP 모드 옵션
STEP_MODE_NONE = 'none'    # STEP 없음
STEP_MODE_LAYER = 'layer'  # 레이어마다 STEP
STEP_MODE_BRICK = 'brick'  # 브릭마다 STEP
VALID_STEP_MODES = [STEP_MODE_NONE, STEP_MODE_LAYER, STEP_MODE_BRICK]


def model_to_ldr(
    model: BrickModel,
    parts_db: Dict,
    skip_validation: bool = False,
    step_mode: str = STEP_MODE_NONE
) -> str:
    """
    BrickModel 전체를 LDR 파일 내용으로 변환

    Args:
        model: 변환할 브릭 모델
        parts_db: 파츠 데이터베이스
        skip_validation: True면 검증 스킵 (디버깅용, 기본값 False)
        step_mode: STEP 출력 모드
            - 'none': STEP 없음 (기본값)
            - 'layer': 레이어마다 0 STEP 추가
            - 'brick': 브릭마다 0 STEP 추가 (조립 설명서용)

    Raises:
        ValidationError: 검증 실패 시 (skip_validation=False일 때)
        ValueError: 잘못된 step_mode
    """
    # step_mode 검증
    if step_mode not in VALID_STEP_MODES:
        raise ValueError(f"Invalid step_mode: '{step_mode}', must be one of {VALID_STEP_MODES}")

    # L1 검증 (스킵 옵션 없으면 항상 실행)
    if not skip_validation:
        errors = validate_model(model, parts_db)
        if errors:
            raise ValidationError(errors)

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
    for i, brick in enumerate(sorted_bricks):
        # 레이어 변경 시
        if brick.layer != current_layer:
            # 이전 레이어 끝에 STEP 추가 (layer 모드, 첫 레이어 제외)
            if step_mode == STEP_MODE_LAYER and current_layer != -1:
                lines.append("")
                lines.append("0 STEP")
                lines.append("")

            current_layer = brick.layer
            lines.append(f"0 // Layer {current_layer}")

        # 브릭 라인 추가
        ldr_line = brick_to_ldr_line(brick, parts_db)
        lines.append(ldr_line)

        # brick 모드: 매 브릭마다 STEP (마지막 브릭 제외)
        if step_mode == STEP_MODE_BRICK and i < len(sorted_bricks) - 1:
            lines.append("")
            lines.append("0 STEP")
            lines.append("")

    # 마지막 STEP 추가 (layer 모드)
    if step_mode == STEP_MODE_LAYER and len(sorted_bricks) > 0:
        lines.append("")
        lines.append("0 STEP")

    return "\n".join(lines)


def model_to_ldr_unsafe(model: BrickModel, parts_db: Dict) -> str:
    """
    검증 없이 LDR 변환 (디버깅/테스트용)

    주의: 프로덕션에서 사용 금지. 잘못된 데이터도 그대로 변환됨.
    """
    return model_to_ldr(model, parts_db, skip_validation=True)


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
