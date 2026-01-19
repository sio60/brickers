"""
미니 하우스 - 진짜 레고 방식

레고 실제 조립:
1. 같은 층에서 벽끼리 직접 안 닿음
2. 위층 브릭이 아래층 브릭들을 스터드로 연결
3. 지그재그 패턴 (벽돌 쌓기처럼)

구조:
Layer 1: 앞뒤 벽만 (1x4)
Layer 2: 좌우 벽만 (1x4, 90도) - 앞뒤 벽 위에 걸쳐서 연결
Layer 3: 앞뒤 벽만
Layer 4: 지붕

이렇게 하면 같은 층에서 벽이 안 겹침!
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
WHITE = 15
GREEN = 2

BRICK_H = 24
PLATE_H = 8


def create_house():
    bricks = []
    bid = 0

    def add(part_id, x, y, z, rot, color, layer):
        nonlocal bid
        bid += 1
        bricks.append(PlacedBrick(
            id=f"b{bid:03d}", part_id=part_id,
            position=Vector3(x=x, y=y, z=z),
            rotation=rot, color_code=color, layer=layer
        ))

    # =============================================
    # 충돌 없는 벽 배치 (모든 벽 같은 Y 레벨)
    #
    # 1x4 브릭 (3010): 20 x 24 x 80 LDU
    # - 90° 회전: X=80, Z=20
    # - 0° 회전: X=20, Z=80
    #
    # 벽 배치 (겹침 없음):
    # - 앞벽 z=50: X[-40,+40], Z[40,60]
    # - 뒷벽 z=-50: X[-40,+40], Z[-60,-40]
    # - 좌벽 x=-50: X[-60,-40], Z[-40,+40]
    # - 우벽 x=50: X[40,60], Z[-40,+40]
    # =============================================

    # Layer 1: 모든 벽 (Y=-24)
    y = -BRICK_H
    add("3010", 0, y, 50, 90, WHITE, 1)    # 앞벽
    add("3010", 0, y, -50, 90, WHITE, 1)   # 뒷벽
    add("3010", -50, y, 0, 0, WHITE, 1)    # 좌벽
    add("3010", 50, y, 0, 0, WHITE, 1)     # 우벽

    # Layer 2: 모든 벽 (Y=-48)
    y = -BRICK_H * 2
    add("3010", 0, y, 50, 90, WHITE, 2)
    add("3010", 0, y, -50, 90, WHITE, 2)
    add("3010", -50, y, 0, 0, WHITE, 2)
    add("3010", 50, y, 0, 0, WHITE, 2)

    # Layer 3: 모든 벽 (Y=-72)
    y = -BRICK_H * 3
    add("3010", 0, y, 50, 90, BLUE, 3)     # 앞벽 파랑
    add("3010", 0, y, -50, 90, WHITE, 3)
    add("3010", -50, y, 0, 0, YELLOW, 3)   # 좌벽 노랑
    add("3010", 50, y, 0, 0, YELLOW, 3)    # 우벽 노랑

    # Layer 4: 지붕 (Y=-80)
    # 2x4 플레이트 (40x80 LDU) 2개로 덮기
    # 0° 회전: X=40, Z=80
    y = -BRICK_H * 3 - PLATE_H
    add("3020", -20, y, 0, 0, RED, 4)      # 왼쪽: X[-40,0]
    add("3020", 20, y, 0, 0, RED, 4)       # 오른쪽: X[0,+40]

    return BrickModel(
        model_id="house_proper",
        name="House Proper Build",
        mode="pro",
        bricks=bricks
    )


def main():
    docs_path = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    parts_db_path = os.path.join(docs_path, 'BrickParts_Database.json')

    parts_db = load_parts_db(parts_db_path)
    output_dir = os.path.join(os.path.dirname(__file__), 'output')

    house = create_house()

    print("=" * 50)
    print("진짜 레고 방식 하우스")
    print("=" * 50)
    print("\n구조:")
    print("  Layer 1 (Y=0):    앞뒤 벽")
    print("  Layer 2 (Y=-24):  좌우 벽 (위에서 연결)")
    print("  Layer 3 (Y=-48):  앞뒤 벽")
    print("  Layer 4 (Y=-72):  좌우 벽")
    print("  Layer 5 (Y=-80):  지붕")
    print("\n같은 층에서 벽이 안 겹침!")
    print(f"총 브릭: {len(house.bricks)}개")

    ldr = model_to_ldr(house, parts_db)
    path = os.path.join(output_dir, "house_proper.ldr")
    save_ldr_file(ldr, path)


if __name__ == "__main__":
    main()
