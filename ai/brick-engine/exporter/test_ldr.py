"""
LDR Converter 테스트 스크립트

간단한 브릭 구조물을 생성하고 LDR 파일로 변환
"""

import os
import sys

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ldr_converter import (
    BrickModel, PlacedBrick, Vector3,
    model_to_ldr, load_parts_db, save_ldr_file
)


def create_test_model_simple():
    """간단한 2층 구조물 - 2x4 브릭 2개"""
    bricks = [
        # 1층: 빨간 2x4 브릭
        PlacedBrick(
            id="brick_001",
            part_id="3001",  # 2x4 브릭
            position=Vector3(x=0, y=0, z=0),
            rotation=0,
            color_code=4,  # 빨강
            layer=0
        ),
        # 2층: 파란 2x4 브릭
        PlacedBrick(
            id="brick_002",
            part_id="3001",
            position=Vector3(x=0, y=-24, z=0),  # -Y가 위쪽이므로 -24
            rotation=0,
            color_code=1,  # 파랑
            layer=1
        ),
    ]

    return BrickModel(
        model_id="test_simple",
        name="Simple Tower",
        mode="adult",
        bricks=bricks
    )


def create_test_model_rotated():
    """회전 테스트 - 90도씩 회전된 브릭들"""
    bricks = [
        # 1층: 0도 회전
        PlacedBrick(
            id="brick_001",
            part_id="3001",
            position=Vector3(x=0, y=0, z=0),
            rotation=0,
            color_code=4,  # 빨강
            layer=0
        ),
        # 2층: 90도 회전
        PlacedBrick(
            id="brick_002",
            part_id="3001",
            position=Vector3(x=0, y=-24, z=0),
            rotation=90,
            color_code=14,  # 노랑
            layer=1
        ),
        # 3층: 0도 회전
        PlacedBrick(
            id="brick_003",
            part_id="3001",
            position=Vector3(x=0, y=-48, z=0),
            rotation=0,
            color_code=1,  # 파랑
            layer=2
        ),
    ]

    return BrickModel(
        model_id="test_rotated",
        name="Rotated Tower",
        mode="adult",
        bricks=bricks
    )


def create_test_model_kids():
    """Kids 모드 테스트 - 큰 브릭만 사용"""
    bricks = [
        # 베이스: 2x4 브릭 2개
        PlacedBrick(
            id="brick_001",
            part_id="3001",  # 2x4
            position=Vector3(x=0, y=0, z=0),
            rotation=0,
            color_code=4,  # 빨강
            layer=0
        ),
        PlacedBrick(
            id="brick_002",
            part_id="3001",
            position=Vector3(x=80, y=0, z=0),  # 옆에 배치
            rotation=0,
            color_code=1,  # 파랑
            layer=0
        ),
        # 2층: 2x6 브릭으로 연결
        PlacedBrick(
            id="brick_003",
            part_id="2456",  # 2x6
            position=Vector3(x=20, y=-24, z=0),
            rotation=0,
            color_code=14,  # 노랑
            layer=1
        ),
    ]

    return BrickModel(
        model_id="test_kids",
        name="Kids Bridge",
        mode="kids",
        target_age="4-6",
        bricks=bricks
    )


def main():
    # 파츠 DB 로드
    docs_path = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    parts_db_path = os.path.join(docs_path, 'BrickParts_Database.json')

    print(f"파츠 DB 로드 중: {parts_db_path}")
    parts_db = load_parts_db(parts_db_path)
    print(f"로드된 파츠 수: {len(parts_db)}")

    # 출력 폴더 생성
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)

    # 테스트 1: 간단한 구조물
    print("\n[테스트 1] 간단한 2층 타워")
    model1 = create_test_model_simple()
    ldr1 = model_to_ldr(model1, parts_db)
    print(ldr1)
    save_ldr_file(ldr1, os.path.join(output_dir, 'test_simple.ldr'))

    # 테스트 2: 회전 테스트
    print("\n[테스트 2] 회전 타워")
    model2 = create_test_model_rotated()
    ldr2 = model_to_ldr(model2, parts_db)
    print(ldr2)
    save_ldr_file(ldr2, os.path.join(output_dir, 'test_rotated.ldr'))

    # 테스트 3: Kids 모드
    print("\n[테스트 3] Kids 브릿지")
    model3 = create_test_model_kids()
    ldr3 = model_to_ldr(model3, parts_db)
    print(ldr3)
    save_ldr_file(ldr3, os.path.join(output_dir, 'test_kids.ldr'))

    print("\n" + "="*50)
    print("테스트 완료!")
    print(f"출력 파일 위치: {output_dir}")
    print("Studio 2.0에서 .ldr 파일을 열어서 확인하세요.")


if __name__ == "__main__":
    main()
