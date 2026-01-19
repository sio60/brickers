"""
브릭 스택 테스트 - 확실하게 붙는 구조

LDraw 좌표계:
- -Y가 위쪽
- 브릭 원점은 보통 중앙 하단

브릭 크기 (LDU):
- 1 스터드 = 20 LDU
- 브릭 높이 = 24 LDU
- 플레이트 높이 = 8 LDU
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ldr_converter import (
    BrickModel, PlacedBrick, Vector3,
    model_to_ldr, load_parts_db, save_ldr_file
)

RED = 4
BLUE = 1
YELLOW = 14
GREEN = 2
WHITE = 15


def test_simple_stack():
    """
    단순 스택: 2x4 브릭 3개를 정확히 쌓기
    """
    bricks = []

    # 2x4 브릭 크기: 40 x 24 x 80 LDU

    # 1층 (바닥) - 빨강
    bricks.append(PlacedBrick(
        id="b1", part_id="3001",
        position=Vector3(x=0, y=0, z=0),
        rotation=0, color_code=RED, layer=0
    ))

    # 2층 - 노랑 (Y = -24, 브릭 높이만큼 위로)
    bricks.append(PlacedBrick(
        id="b2", part_id="3001",
        position=Vector3(x=0, y=-24, z=0),
        rotation=0, color_code=YELLOW, layer=1
    ))

    # 3층 - 파랑 (Y = -48)
    bricks.append(PlacedBrick(
        id="b3", part_id="3001",
        position=Vector3(x=0, y=-48, z=0),
        rotation=0, color_code=BLUE, layer=2
    ))

    return BrickModel(
        model_id="stack_test",
        name="Simple Stack Test",
        mode="pro",
        bricks=bricks
    )


def test_wall_connection():
    """
    벽 연결 테스트: ㄱ자 형태

    2x4 브릭 배치:
    - 가로 브릭 (0도): x방향 40, z방향 80 (2x4)
    - 세로 브릭 (90도): x방향 80, z방향 40 (4x2로 회전)
    """
    bricks = []

    # 가로 브릭 - 빨강
    bricks.append(PlacedBrick(
        id="h1", part_id="3001",
        position=Vector3(x=0, y=0, z=0),
        rotation=0, color_code=RED, layer=0
    ))

    # 세로 브릭 (90도 회전) - 파랑
    # 90도 회전하면 x,z가 바뀜
    # 가로 브릭 끝(x=40, z=80)에 연결
    bricks.append(PlacedBrick(
        id="v1", part_id="3001",
        position=Vector3(x=40, y=0, z=60),
        rotation=90, color_code=BLUE, layer=0
    ))

    return BrickModel(
        model_id="wall_test",
        name="Wall Connection Test",
        mode="pro",
        bricks=bricks
    )


def test_slope_on_brick():
    """
    슬로프 테스트: 브릭 위에 슬로프 올리기

    3039 (Slope 45 2x2): 40 x 24 x 40 LDU
    슬로프는 경사면이 있어서 방향이 중요함
    """
    bricks = []

    # 베이스 브릭 - 흰색 2x4
    bricks.append(PlacedBrick(
        id="base", part_id="3001",
        position=Vector3(x=0, y=0, z=0),
        rotation=0, color_code=WHITE, layer=0
    ))

    # 슬로프 0도 - 빨강 (경사면이 +Z 방향)
    bricks.append(PlacedBrick(
        id="slope1", part_id="3039",
        position=Vector3(x=0, y=-24, z=0),
        rotation=0, color_code=RED, layer=1
    ))

    # 슬로프 180도 - 파랑 (경사면이 -Z 방향)
    bricks.append(PlacedBrick(
        id="slope2", part_id="3039",
        position=Vector3(x=0, y=-24, z=40),
        rotation=180, color_code=BLUE, layer=1
    ))

    return BrickModel(
        model_id="slope_test",
        name="Slope Test",
        mode="pro",
        bricks=bricks
    )


def main():
    docs_path = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    parts_db_path = os.path.join(docs_path, 'BrickParts_Database.json')
    parts_db = load_parts_db(parts_db_path)

    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)

    tests = [
        ("stack_test.ldr", test_simple_stack()),
        ("wall_test.ldr", test_wall_connection()),
        ("slope_test.ldr", test_slope_on_brick()),
    ]

    for filename, model in tests:
        ldr = model_to_ldr(model, parts_db)
        path = os.path.join(output_dir, filename)
        save_ldr_file(ldr, path)
        print(f"생성: {filename}")

    print("\n테스트 파일 3개 생성 완료!")
    print("Studio에서 각각 열어서 확인해보세요.")


if __name__ == "__main__":
    main()
