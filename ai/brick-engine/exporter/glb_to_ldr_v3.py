#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GLB → LDR 변환기 v3 (고도화 버전)

GPT 코드 기반 + 추가 기능:
- Greedy 브릭 패킹 (큰 브릭 우선)
- 슬로프/플레이트 지원
- 연결 강도 최적화 (브릭 오프셋 패턴)
- 물리 안정성 점수
- 대칭 감지/강제
- 텍스처 기반 색상 추출
- Kids/Pro 모드
- BOM/PDF 자동 생성
- STEP 모드 지원
- Cap Plates (상단 마감 품질 향상)

작성: Brick CoScientist

Usage:
  python glb_to_ldr_v3.py input.glb output.ldr --mode pro --cap all
  python glb_to_ldr_v3.py input.glb --studs 16 --cap top
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Tuple, List, Optional, Literal
from pathlib import Path
from datetime import datetime
import argparse
import sys
import os
import numpy as np
import trimesh
from scipy.spatial import KDTree

# 프로젝트 모듈 임포트
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from bom_generator import extract_bom_from_ldr, load_parts_db
    from pdf_generator import generate_pdf_from_bom_report
    HAS_BOM_PDF = True
except ImportError:
    HAS_BOM_PDF = False


# =============================================================================
# 상수 정의
# =============================================================================
LDU_PER_STUD = 20       # 1 스터드 = 20 LDU
LDU_BRICK_H = 24        # 브릭 높이
LDU_PLATE_H = 8         # 플레이트 높이

# 회전 행렬
ROT_0   = "1 0 0 0 1 0 0 0 1"
ROT_90  = "0 0 1 0 1 0 -1 0 0"
ROT_180 = "-1 0 0 0 1 0 0 0 -1"
ROT_270 = "0 0 -1 0 1 0 1 0 0"


# =============================================================================
# LDraw 색상 팔레트 (확장)
# =============================================================================
LDRAW_COLORS: Dict[int, Tuple[int, int, int, str]] = {
    0:  (33, 33, 33, "Black"),
    1:  (0, 85, 191, "Blue"),
    2:  (0, 123, 40, "Green"),
    3:  (0, 131, 138, "Teal"),
    4:  (180, 0, 0, "Red"),
    5:  (171, 67, 183, "Dark Pink"),
    6:  (91, 28, 12, "Brown"),
    7:  (156, 146, 145, "Light Gray"),
    8:  (99, 95, 82, "Dark Gray"),
    9:  (107, 171, 220, "Light Blue"),
    10: (97, 189, 76, "Bright Green"),
    11: (0, 170, 164, "Light Turquoise"),
    12: (255, 99, 71, "Salmon"),
    13: (255, 148, 194, "Pink"),
    14: (255, 220, 0, "Yellow"),
    15: (255, 255, 255, "White"),
    17: (173, 221, 80, "Lime"),
    18: (251, 171, 24, "Light Orange"),
    19: (215, 197, 153, "Tan"),
    20: (215, 240, 215, "Light Violet"),
    25: (245, 134, 36, "Orange"),
    26: (202, 31, 123, "Magenta"),
    27: (159, 195, 65, "Bright Light Green"),
    28: (33, 55, 23, "Dark Green"),
    29: (160, 188, 172, "Light Bluish Gray"),  # 추가
    70: (89, 47, 14, "Reddish Brown"),
    71: (175, 181, 199, "Light Bluish Gray"),
    72: (108, 110, 104, "Dark Bluish Gray"),
    73: (117, 142, 220, "Medium Blue"),
    74: (183, 212, 37, "Medium Lime"),
    78: (254, 186, 189, "Light Pink"),
    84: (170, 125, 85, "Medium Dark Flesh"),
    85: (89, 39, 115, "Dark Purple"),
    320: (120, 27, 33, "Dark Red"),
    378: (163, 193, 173, "Sand Green"),
    484: (179, 62, 0, "Dark Orange"),
}

_COLOR_IDS = list(LDRAW_COLORS.keys())
_COLOR_RGB = np.array([LDRAW_COLORS[i][:3] for i in _COLOR_IDS], dtype=np.float32)
_COLOR_TREE = KDTree(_COLOR_RGB)


def match_ldraw_color(rgb: Tuple[float, float, float]) -> Tuple[int, str]:
    """RGB → 가장 가까운 LDraw 색상 (코드, 이름)"""
    v = np.array(rgb, dtype=np.float32)
    if v.max() <= 1.0:
        v *= 255.0
    _, idx = _COLOR_TREE.query(v)
    code = _COLOR_IDS[int(idx)]
    return code, LDRAW_COLORS[code][3]


# =============================================================================
# 브릭 파츠 정의 (Kids/Pro 분리)
# =============================================================================
@dataclass
class BrickPart:
    ldraw_id: str
    name: str
    width: int      # X 스터드
    depth: int      # Z 스터드
    height: int     # 1=플레이트, 3=브릭
    is_slope: bool = False
    min_age: int = 4  # 최소 연령

# Pro 모드: 모든 파츠
PARTS_PRO = [
    # 브릭 (큰 것부터)
    BrickPart("3009.dat", "Brick 1x6", 6, 1, 3),
    BrickPart("3007.dat", "Brick 2x8", 8, 2, 3),
    BrickPart("3006.dat", "Brick 2x10", 10, 2, 3),
    BrickPart("3001.dat", "Brick 2x4", 4, 2, 3),
    BrickPart("3002.dat", "Brick 2x3", 3, 2, 3),
    BrickPart("3003.dat", "Brick 2x2", 2, 2, 3),
    BrickPart("3004.dat", "Brick 1x2", 2, 1, 3),
    BrickPart("3005.dat", "Brick 1x1", 1, 1, 3),
    # 플레이트
    BrickPart("3020.dat", "Plate 2x4", 4, 2, 1),
    BrickPart("3021.dat", "Plate 2x3", 3, 2, 1),
    BrickPart("3022.dat", "Plate 2x2", 2, 2, 1),
    BrickPart("3023.dat", "Plate 1x2", 2, 1, 1),
    BrickPart("3024.dat", "Plate 1x1", 1, 1, 1),
    # 슬로프
    BrickPart("3040.dat", "Slope 45 2x1", 1, 2, 3, is_slope=True),
    BrickPart("3039.dat", "Slope 45 2x2", 2, 2, 3, is_slope=True),
]

# Kids 모드: 큰 파츠만 (1x1 제외)
PARTS_KIDS = [
    BrickPart("3007.dat", "Brick 2x8", 8, 2, 3, min_age=7),
    BrickPart("3001.dat", "Brick 2x4", 4, 2, 3, min_age=4),
    BrickPart("3002.dat", "Brick 2x3", 3, 2, 3, min_age=4),
    BrickPart("3003.dat", "Brick 2x2", 2, 2, 3, min_age=4),
    BrickPart("3004.dat", "Brick 1x2", 2, 1, 3, min_age=7),
    # 1x1 없음 - 삼킴 위험
]

# Cap Plates: 상단 마감용 플레이트 (큰 것부터)
CAP_PLATES = [
    BrickPart("3020.dat", "Plate 2x4", 4, 2, 1),
    BrickPart("3021.dat", "Plate 2x3", 3, 2, 1),
    BrickPart("3022.dat", "Plate 2x2", 2, 2, 1),
    BrickPart("3710.dat", "Plate 1x4", 4, 1, 1),
    BrickPart("3623.dat", "Plate 1x3", 3, 1, 1),
    BrickPart("3023.dat", "Plate 1x2", 2, 1, 1),
    BrickPart("3024.dat", "Plate 1x1", 1, 1, 1),
]

# Kids용 Cap Plates (1x1 제외)
CAP_PLATES_KIDS = [
    BrickPart("3020.dat", "Plate 2x4", 4, 2, 1),
    BrickPart("3021.dat", "Plate 2x3", 3, 2, 1),
    BrickPart("3022.dat", "Plate 2x2", 2, 2, 1),
    BrickPart("3023.dat", "Plate 1x2", 2, 1, 1),
]


# =============================================================================
# 데이터 구조
# =============================================================================
@dataclass
class VoxelGrid:
    """복셀 그리드 데이터"""
    occupied: np.ndarray      # (nx, ny, nz) bool
    color_ids: np.ndarray     # (nx, ny, nz) int16, -1=빈칸
    pitch: float
    origin: np.ndarray

    @property
    def shape(self) -> Tuple[int, int, int]:
        return self.occupied.shape


@dataclass
class PlacedBrick:
    """배치된 브릭"""
    part: BrickPart
    x: int          # 그리드 X
    y: int          # 그리드 Y (층)
    z: int          # 그리드 Z
    rotation: int   # 0, 90, 180, 270
    color_code: int
    color_name: str


@dataclass
class ConversionResult:
    """변환 결과"""
    placements: List[PlacedBrick]
    grid_shape: Tuple[int, int, int]
    total_bricks: int
    brick_counts: Dict[str, int]
    stability_score: float
    color_summary: Dict[str, int]
    warnings: List[str] = field(default_factory=list)


# =============================================================================
# GLB 로딩
# =============================================================================
def load_glb_scene(path: Path) -> trimesh.Scene:
    """GLB/GLTF 로드"""
    print(f"[1/6] GLB 로딩: {path.name}")
    obj = trimesh.load(path.as_posix(), force="scene")
    if isinstance(obj, trimesh.Scene):
        return obj
    scene = trimesh.Scene()
    scene.add_geometry(obj)
    return scene


def get_meshes(scene: trimesh.Scene) -> List[trimesh.Trimesh]:
    """Scene에서 메시 추출"""
    meshes = []
    for name, geom in scene.geometry.items():
        if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 0:
            meshes.append(geom)
    return meshes


def calculate_auto_pitch(scene: trimesh.Scene, target_studs: int) -> float:
    """목표 스터드 수에 맞는 pitch 계산"""
    meshes = get_meshes(scene)
    if not meshes:
        return 1.0
    combined = trimesh.util.concatenate(meshes)
    size = combined.bounds[1] - combined.bounds[0]
    max_dim = float(np.max(size))
    return max_dim / target_studs if max_dim > 0 else 1.0


# =============================================================================
# 색상 추출 (텍스처/UV 기반)
# =============================================================================
def extract_face_colors(mesh: trimesh.Trimesh) -> np.ndarray:
    """메시에서 면별 색상 추출"""
    # 1. 텍스처에서 추출 시도
    mat = getattr(mesh.visual, "material", None)
    if mat and hasattr(mat, "image") and mat.image is not None:
        uv = getattr(mesh.visual, "uv", None)
        if uv is not None:
            uv_face = uv[mesh.faces].mean(axis=1)  # (F, 2)
            try:
                rgba = trimesh.visual.color.uv_to_color(uv_face, mat.image)
                return rgba[:, :3].astype(np.float32)
            except:
                pass

    # 2. 정점 색상에서 추출
    vc = getattr(mesh.visual, "vertex_colors", None)
    if vc is not None and len(vc) > 0:
        vc = np.asarray(vc, dtype=np.float32)
        if vc.shape[1] >= 3:
            rgb = vc[:, :3]
            if rgb.max() <= 1.0:
                rgb *= 255.0
            return rgb[mesh.faces].mean(axis=1)

    # 3. 재질 기본 색상
    if mat and hasattr(mat, "baseColorFactor"):
        bc = mat.baseColorFactor
        if bc is not None and len(bc) >= 3:
            col = np.array([bc[0], bc[1], bc[2]], dtype=np.float32)
            if col.max() <= 1.0:
                col *= 255.0
            return np.tile(col, (len(mesh.faces), 1))

    # 4. 기본 회색
    return np.tile([160, 160, 160], (len(mesh.faces), 1)).astype(np.float32)


# =============================================================================
# 복셀화
# =============================================================================
def voxelize_scene(scene: trimesh.Scene, pitch: float) -> VoxelGrid:
    """Scene을 복셀 그리드로 변환"""
    print(f"[2/6] 복셀화 중 (pitch={pitch:.4f})...")

    meshes = get_meshes(scene)
    if not meshes:
        raise ValueError("메시 없음")

    combined = trimesh.util.concatenate(meshes)
    origin = combined.bounds[0]

    # 복셀화
    voxelized = trimesh.voxel.creation.voxelize(combined, pitch=pitch)
    if voxelized.points is None or len(voxelized.points) == 0:
        raise ValueError("복셀화 실패 - pitch를 늘려보세요")

    occupied = voxelized.matrix.astype(bool)
    nx, ny, nz = occupied.shape

    # 복셀별 색상 할당
    filled_idx = np.array(voxelized.sparse_indices, dtype=int)
    centers = np.asarray(voxelized.points, dtype=np.float32)

    face_colors = extract_face_colors(combined)
    face_centers = combined.triangles_center.astype(np.float32)
    face_tree = KDTree(face_centers)

    _, face_idx = face_tree.query(centers)
    rgb_values = face_colors[face_idx]

    color_ids = np.array([
        match_ldraw_color(tuple(rgb_values[i]))[0]
        for i in range(len(rgb_values))
    ], dtype=np.int16)

    color_grid = np.full((nx, ny, nz), -1, dtype=np.int16)
    color_grid[filled_idx[:, 0], filled_idx[:, 1], filled_idx[:, 2]] = color_ids

    print(f"    복셀: {len(centers)}개, 그리드: {nx}x{ny}x{nz}")

    return VoxelGrid(
        occupied=occupied,
        color_ids=color_grid,
        pitch=pitch,
        origin=origin
    )


# =============================================================================
# 색상 스무딩 (노이즈 감소)
# =============================================================================
def smooth_colors(grid: VoxelGrid, passes: int = 1) -> None:
    """인접 복셀 기반 색상 스무딩"""
    if passes <= 0:
        return

    print(f"[3/6] 색상 스무딩 ({passes} 패스)...")
    occ, cid = grid.occupied, grid.color_ids
    nx, ny, nz = occ.shape

    for _ in range(passes):
        new_cid = cid.copy()
        for x in range(nx):
            for y in range(ny):
                for z in range(nz):
                    if not occ[x, y, z]:
                        continue
                    neighbors = []
                    for dx, dy, dz in [(0,0,0), (1,0,0), (-1,0,0), (0,1,0), (0,-1,0), (0,0,1), (0,0,-1)]:
                        xx, yy, zz = x+dx, y+dy, z+dz
                        if 0 <= xx < nx and 0 <= yy < ny and 0 <= zz < nz:
                            if occ[xx, yy, zz] and cid[xx, yy, zz] >= 0:
                                neighbors.append(int(cid[xx, yy, zz]))
                    if len(neighbors) >= 3:
                        vals, counts = np.unique(neighbors, return_counts=True)
                        new_cid[x, y, z] = vals[np.argmax(counts)]
        cid[:] = new_cid


# =============================================================================
# 대칭 감지 및 강제
# =============================================================================
def detect_symmetry(grid: VoxelGrid) -> Optional[Literal["x", "z"]]:
    """대칭축 감지"""
    occ = grid.occupied
    nx, _, nz = occ.shape

    # X축 대칭 점수
    x_half = nx // 2
    x_left = occ[:x_half]
    x_right = occ[nx - x_half:][::-1]
    x_score = np.mean(x_left == x_right) if x_left.size > 0 else 0

    # Z축 대칭 점수
    z_half = nz // 2
    z_front = occ[:, :, :z_half]
    z_back = occ[:, :, nz - z_half:][:, :, ::-1]
    z_score = np.mean(z_front == z_back) if z_front.size > 0 else 0

    if max(x_score, z_score) >= 0.90:
        return "x" if x_score >= z_score else "z"
    return None


def enforce_symmetry(grid: VoxelGrid, axis: Literal["x", "z"]) -> None:
    """대칭 강제 적용"""
    print(f"    대칭 강제: {axis}축")
    occ, cid = grid.occupied, grid.color_ids
    nx, ny, nz = occ.shape

    if axis == "x":
        for x in range(nx // 2):
            mx = nx - 1 - x
            combined = occ[x] | occ[mx]
            occ[x] = combined
            occ[mx] = combined
            # 색상: 왼쪽 우선
            for y in range(ny):
                for z in range(nz):
                    if combined[y, z]:
                        if cid[x, y, z] >= 0:
                            cid[mx, y, z] = cid[x, y, z]
                        elif cid[mx, y, z] >= 0:
                            cid[x, y, z] = cid[mx, y, z]
    else:  # z축
        for z in range(nz // 2):
            mz = nz - 1 - z
            combined = occ[:, :, z] | occ[:, :, mz]
            occ[:, :, z] = combined
            occ[:, :, mz] = combined
            for x in range(nx):
                for y in range(ny):
                    if combined[x, y]:
                        if cid[x, y, z] >= 0:
                            cid[x, y, mz] = cid[x, y, z]
                        elif cid[x, y, mz] >= 0:
                            cid[x, y, z] = cid[x, y, mz]


# =============================================================================
# Greedy 브릭 패킹 (연결 강도 최적화)
# =============================================================================
def greedy_pack_bricks(
    grid: VoxelGrid,
    parts: List[BrickPart],
    optimize_bonds: bool = True
) -> List[PlacedBrick]:
    """
    Greedy 브릭 패킹

    - 큰 브릭부터 배치
    - 지지대 검사
    - 연결 강도 최적화 (층별 오프셋)
    """
    print(f"[4/6] 브릭 패킹 중...")

    occ, cid = grid.occupied, grid.color_ids
    nx, ny, nz = occ.shape
    used = np.zeros_like(occ, dtype=bool)
    placements: List[PlacedBrick] = []

    def dominant_color(x: int, y: int, z: int, w: int, d: int) -> Tuple[int, str]:
        """영역의 지배적 색상"""
        block = cid[x:x+w, y, z:z+d]
        valid = block[block >= 0]
        if len(valid) == 0:
            return 71, "Light Bluish Gray"
        vals, counts = np.unique(valid, return_counts=True)
        code = int(vals[np.argmax(counts)])
        return code, LDRAW_COLORS.get(code, (0,0,0,"Unknown"))[3]

    def can_place(x: int, y: int, z: int, w: int, d: int) -> bool:
        """배치 가능 여부 (경계, 점유, 지지대 검사)"""
        if x + w > nx or z + d > nz:
            return False
        region_occ = occ[x:x+w, y, z:z+d]
        region_used = used[x:x+w, y, z:z+d]
        if not region_occ.all() or region_used.any():
            return False
        # 지지대 검사: y=0이거나 아래층 전체 점유
        if y > 0:
            below = occ[x:x+w, y-1, z:z+d]
            if not below.all():
                return False
        return True

    def bond_score(x: int, y: int, z: int, w: int, d: int) -> float:
        """
        연결 강도 점수 (높을수록 좋음)
        - 아래층 브릭과 겹치는 정도 평가
        - 이상적: 50% 오프셋으로 겹침
        """
        if y == 0:
            return 1.0
        # 아래층에서 사용된 영역과의 겹침 확인
        below_used = used[x:x+w, y-1, z:z+d]
        overlap_ratio = np.mean(below_used)
        # 30-70% 겹침이 이상적
        if 0.3 <= overlap_ratio <= 0.7:
            return 1.5
        elif overlap_ratio > 0:
            return 1.0
        return 0.5

    # 층별 처리 (아래→위)
    for y in range(ny):
        # 연결 강도 최적화: 홀수층은 오프셋 시도
        offset = 1 if (optimize_bonds and y % 2 == 1) else 0

        for z in range(nz):
            x_start = offset if offset < nx else 0
            for x in range(x_start, nx):
                if not occ[x, y, z] or used[x, y, z]:
                    continue

                placed = False
                best_placement = None
                best_score = -1

                for part in parts:
                    # 두 방향 시도 (0도, 90도)
                    orientations = [(part.width, part.depth, 0)]
                    if part.width != part.depth:
                        orientations.append((part.depth, part.width, 90))

                    for w, d, rot in orientations:
                        if can_place(x, y, z, w, d):
                            score = bond_score(x, y, z, w, d) * (w * d)  # 크기 보너스
                            if score > best_score:
                                best_score = score
                                color_code, color_name = dominant_color(x, y, z, w, d)
                                best_placement = (part, x, y, z, rot, w, d, color_code, color_name)
                            placed = True
                            break
                    if placed and not optimize_bonds:
                        break

                if best_placement:
                    part, px, py, pz, rot, w, d, cc, cn = best_placement
                    used[px:px+w, py, pz:pz+d] = True
                    placements.append(PlacedBrick(
                        part=part,
                        x=px, y=py, z=pz,
                        rotation=rot,
                        color_code=cc,
                        color_name=cn
                    ))

    print(f"    브릭 배치: {len(placements)}개")
    return placements


# =============================================================================
# Cap Plates (상단 마감 품질 향상)
# =============================================================================
def _find_top_surfaces(
    grid: VoxelGrid,
    used: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """
    노출된 상단 표면 찾기

    Returns:
        y_top: (nx, nz) 각 위치의 최상단 y 인덱스 (-1=빈칸)
        exposed: (nx, nz) 노출 여부 (위에 아무것도 없음)
    """
    occ = grid.occupied
    nx, ny, nz = occ.shape

    y_top = np.full((nx, nz), -1, dtype=int)
    exposed = np.zeros((nx, nz), dtype=bool)

    for x in range(nx):
        for z in range(nz):
            # 해당 열에서 점유된 y값들
            ys = np.where(occ[x, :, z])[0]
            if ys.size == 0:
                continue
            yt = int(ys.max())
            y_top[x, z] = yt
            # 위에 아무것도 없으면 노출
            if yt == ny - 1 or not occ[x, yt + 1, z]:
                exposed[x, z] = True

    return y_top, exposed


def _greedy_2d_pack(
    mask: np.ndarray,
    color_grid: np.ndarray,
    parts: List[BrickPart]
) -> List[Tuple[BrickPart, int, int, int, int, str]]:
    """
    2D Greedy 패킹 (x, z 평면)

    Returns:
        List of (part, x, z, rotation, color_code, color_name)
    """
    nx, nz = mask.shape
    used = np.zeros_like(mask, dtype=bool)
    placements = []

    def can_place(x: int, z: int, w: int, d: int) -> bool:
        if x + w > nx or z + d > nz:
            return False
        region = mask[x:x+w, z:z+d]
        if not region.all():
            return False
        if used[x:x+w, z:z+d].any():
            return False
        return True

    def dominant_color(x: int, z: int, w: int, d: int) -> Tuple[int, str]:
        block = color_grid[x:x+w, z:z+d]
        valid = block[block >= 0]
        if len(valid) == 0:
            return 71, "Light Bluish Gray"
        vals, counts = np.unique(valid, return_counts=True)
        code = int(vals[np.argmax(counts)])
        return code, LDRAW_COLORS.get(code, (0,0,0,"Unknown"))[3]

    for z in range(nz):
        for x in range(nx):
            if not mask[x, z] or used[x, z]:
                continue

            placed = False
            for part in parts:
                # 두 방향 시도
                orientations = [(part.width, part.depth, 0)]
                if part.width != part.depth:
                    orientations.append((part.depth, part.width, 90))

                for w, d, rot in orientations:
                    if can_place(x, z, w, d):
                        cc, cn = dominant_color(x, z, w, d)
                        used[x:x+w, z:z+d] = True
                        placements.append((part, x, z, rot, cc, cn))
                        placed = True
                        break
                if placed:
                    break

            if not placed:
                used[x, z] = True  # 못 채우면 스킵

    return placements


def cap_with_plates(
    grid: VoxelGrid,
    brick_placements: List[PlacedBrick],
    cap_mode: Literal["off", "top", "all"] = "all",
    mode: Literal["pro", "kids"] = "pro",
    min_patch_area: int = 2
) -> List[PlacedBrick]:
    """
    상단 표면에 플레이트 덮어 마감 품질 향상

    Args:
        grid: 복셀 그리드
        brick_placements: 기존 브릭 배치
        cap_mode:
            - "off": 비활성화
            - "top": 최상단 레이어만
            - "all": 모든 노출 표면
        mode: "pro" or "kids" (1x1 허용 여부)
        min_patch_area: 최소 영역 크기

    Returns:
        추가된 플레이트 배치 리스트
    """
    if cap_mode == "off":
        return []

    print(f"    Cap plates 적용 중 (mode={cap_mode})...")

    occ, cid = grid.occupied, grid.color_ids
    nx, ny, nz = occ.shape

    # 사용 맵 구축 (브릭이 차지한 영역)
    used = np.zeros_like(occ, dtype=bool)
    for p in brick_placements:
        w = p.part.width if p.rotation == 0 else p.part.depth
        d = p.part.depth if p.rotation == 0 else p.part.width
        used[p.x:p.x+w, p.y, p.z:p.z+d] = True

    # 상단 표면 찾기
    y_top, exposed = _find_top_surfaces(grid, used)

    # 대상 레이어 결정
    if cap_mode == "top":
        valid_ys = y_top[exposed]
        if valid_ys.size == 0:
            return []
        target_y = int(valid_ys.max())
        layers = [target_y]
    else:  # "all"
        layers = sorted(set(int(v) for v in y_top[exposed].ravel() if v >= 0))

    # 플레이트 파츠 선택
    cap_parts = CAP_PLATES_KIDS if mode == "kids" else CAP_PLATES

    plate_placements: List[PlacedBrick] = []

    for yl in layers:
        # 해당 레이어의 노출 마스크
        layer_mask = exposed & (y_top == yl)
        if layer_mask.sum() < min_patch_area:
            continue

        # 색상 그리드
        color_grid = np.full((nx, nz), -1, dtype=np.int16)
        for x in range(nx):
            for z in range(nz):
                if layer_mask[x, z]:
                    color_grid[x, z] = cid[x, yl, z]

        # 2D 패킹
        packed = _greedy_2d_pack(layer_mask, color_grid, cap_parts)

        for part, x, z, rot, cc, cn in packed:
            # 플레이트는 브릭 위에 놓이므로 y = yl + 1 (논리적)
            # 실제 LDR에서는 브릭 높이 위에 플레이트 높이로 계산
            plate_placements.append(PlacedBrick(
                part=part,
                x=x,
                y=yl,  # 기준 레이어 (LDR 생성 시 보정)
                z=z,
                rotation=rot,
                color_code=cc,
                color_name=cn
            ))

    print(f"    Cap plates: {len(plate_placements)}개 추가")
    return plate_placements


# =============================================================================
# 안정성 점수 계산
# =============================================================================
def calculate_stability(placements: List[PlacedBrick], grid_shape: Tuple[int, int, int]) -> float:
    """
    물리 안정성 점수 (0-100)

    - 지지대 비율
    - 무게 중심
    - 연결 강도
    """
    if not placements:
        return 0.0

    nx, ny, nz = grid_shape
    scores = []

    # 1. 지지대 점수
    base_count = sum(1 for p in placements if p.y == 0)
    total = len(placements)
    support_ratio = base_count / total if total > 0 else 0
    scores.append(min(support_ratio * 2, 1.0) * 30)  # 최대 30점

    # 2. 무게 중심 점수 (중앙에 가까울수록 좋음)
    cx = sum(p.x for p in placements) / total
    cz = sum(p.z for p in placements) / total
    center_x, center_z = nx / 2, nz / 2
    dist = np.sqrt((cx - center_x)**2 + (cz - center_z)**2)
    max_dist = np.sqrt(center_x**2 + center_z**2)
    center_score = (1 - dist / max_dist) if max_dist > 0 else 1
    scores.append(center_score * 30)  # 최대 30점

    # 3. 큰 브릭 비율 (안정성)
    large_bricks = sum(1 for p in placements if p.part.width * p.part.depth >= 4)
    large_ratio = large_bricks / total if total > 0 else 0
    scores.append(large_ratio * 40)  # 최대 40점

    return min(sum(scores), 100.0)


# =============================================================================
# LDR 생성
# =============================================================================
def generate_ldr(
    placements: List[PlacedBrick],
    grid_shape: Tuple[int, int, int],
    title: str = "Model",
    mode: str = "pro",
    step_mode: Literal["none", "layer", "brick"] = "layer",
    cap_placements: Optional[List[PlacedBrick]] = None
) -> str:
    """LDR 파일 내용 생성"""
    print(f"[5/6] LDR 생성 중 (step_mode={step_mode})...")

    nx, ny, nz = grid_shape
    cx = (nx - 1) / 2.0
    cz = (nz - 1) / 2.0

    lines = [
        f"0 {title}",
        f"0 Name: {title}.ldr",
        "0 Author: Brick CoScientist v3",
        f"0 Mode: {mode}",
        f"0 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    # 층별 정렬
    placements_by_layer = {}
    for p in placements:
        if p.y not in placements_by_layer:
            placements_by_layer[p.y] = []
        placements_by_layer[p.y].append(p)

    for layer in sorted(placements_by_layer.keys()):
        if step_mode != "none":
            lines.append(f"0 // Layer {layer}")

        for p in placements_by_layer[layer]:
            # 위치 계산 (중앙 정렬)
            w = p.part.width if p.rotation == 0 else p.part.depth
            d = p.part.depth if p.rotation == 0 else p.part.width

            sx = (p.x + (w - 1) / 2.0) - cx
            sz = (p.z + (d - 1) / 2.0) - cz

            ldu_x = int(round(sx * LDU_PER_STUD))
            ldu_z = int(round(sz * LDU_PER_STUD))
            ldu_y = int(round(-p.y * LDU_BRICK_H))

            rot = {0: ROT_0, 90: ROT_90, 180: ROT_180, 270: ROT_270}.get(p.rotation, ROT_0)

            lines.append(f"1 {p.color_code} {ldu_x} {ldu_y} {ldu_z} {rot} {p.part.ldraw_id}")

            if step_mode == "brick":
                lines.append("0 STEP")

        if step_mode == "layer":
            lines.append("0 STEP")
            lines.append("")

    # Cap Plates 출력
    if cap_placements:
        lines.append("0 // Cap Plates (top finish)")
        for p in cap_placements:
            w = p.part.width if p.rotation == 0 else p.part.depth
            d = p.part.depth if p.rotation == 0 else p.part.width

            sx = (p.x + (w - 1) / 2.0) - cx
            sz = (p.z + (d - 1) / 2.0) - cz

            ldu_x = int(round(sx * LDU_PER_STUD))
            ldu_z = int(round(sz * LDU_PER_STUD))
            # 플레이트는 브릭 위에: 브릭 상단 = -y*24 - 24, 플레이트 바닥 = 브릭상단
            ldu_y = int(round(-p.y * LDU_BRICK_H - LDU_BRICK_H))

            rot = {0: ROT_0, 90: ROT_90, 180: ROT_180, 270: ROT_270}.get(p.rotation, ROT_0)

            lines.append(f"1 {p.color_code} {ldu_x} {ldu_y} {ldu_z} {rot} {p.part.ldraw_id}")

        if step_mode != "none":
            lines.append("0 STEP")

    return "\n".join(lines)


# =============================================================================
# 메인 변환 함수
# =============================================================================
def convert_glb_to_ldr(
    input_path: str,
    output_path: Optional[str] = None,
    mode: Literal["pro", "kids"] = "pro",
    target_studs: int = 20,
    symmetry: Literal["off", "auto", "x", "z"] = "auto",
    color_smooth: int = 1,
    optimize_bonds: bool = True,
    step_mode: Literal["none", "layer", "brick"] = "layer",
    cap_mode: Literal["off", "top", "all"] = "all",
    generate_bom_pdf: bool = True,
) -> ConversionResult:
    """
    GLB → LDR 변환 메인 함수

    Args:
        input_path: 입력 GLB 파일
        output_path: 출력 LDR 파일 (None=자동)
        mode: "pro" or "kids"
        target_studs: 목표 스터드 수
        symmetry: 대칭 처리
        color_smooth: 색상 스무딩 패스
        optimize_bonds: 연결 강도 최적화
        step_mode: STEP 모드
        cap_mode: Cap plates 모드 ("off", "top", "all")
        generate_bom_pdf: BOM/PDF 생성 여부
    """
    print("=" * 60)
    print(f"GLB → LDR 변환 v3 ({mode.upper()} 모드)")
    print("=" * 60)

    in_path = Path(input_path).resolve()
    if not in_path.exists():
        raise FileNotFoundError(f"파일 없음: {in_path}")

    if output_path is None:
        out_dir = Path(__file__).parent / "output"
        out_dir.mkdir(exist_ok=True)
        output_path = str(out_dir / f"{in_path.stem}.ldr")

    out_path = Path(output_path)

    # 1. GLB 로드
    scene = load_glb_scene(in_path)

    # 2. pitch 계산 및 복셀화
    pitch = calculate_auto_pitch(scene, target_studs)
    grid = voxelize_scene(scene, pitch)

    # 3. 색상 스무딩
    smooth_colors(grid, passes=color_smooth)

    # 4. 대칭 처리
    if symmetry != "off":
        if symmetry == "auto":
            axis = detect_symmetry(grid)
            if axis:
                enforce_symmetry(grid, axis)
        else:
            enforce_symmetry(grid, symmetry)

    # 5. 브릭 패킹
    parts = PARTS_KIDS if mode == "kids" else PARTS_PRO
    placements = greedy_pack_bricks(grid, parts, optimize_bonds)

    if not placements:
        raise ValueError("배치된 브릭 없음")

    # 5.5 Cap Plates (상단 마감)
    cap_placements = cap_with_plates(grid, placements, cap_mode, mode)

    # 6. 통계 계산
    all_placements = placements + cap_placements
    brick_counts: Dict[str, int] = {}
    color_summary: Dict[str, int] = {}
    for p in all_placements:
        brick_counts[p.part.name] = brick_counts.get(p.part.name, 0) + 1
        color_summary[p.color_name] = color_summary.get(p.color_name, 0) + 1

    stability = calculate_stability(placements, grid.shape)

    # 7. LDR 생성
    title = in_path.stem
    ldr_content = generate_ldr(placements, grid.shape, title, mode, step_mode, cap_placements)
    out_path.write_text(ldr_content, encoding="utf-8")

    print(f"\n[6/6] 저장 완료: {out_path}")

    # 8. BOM/PDF 생성
    if generate_bom_pdf and HAS_BOM_PDF:
        try:
            docs_dir = Path(__file__).parent.parent.parent.parent / "docs"
            parts_db = load_parts_db(docs_dir / "BrickParts_Database.json")
            bom = extract_bom_from_ldr(str(out_path), parts_db)

            bom_dict = {
                "model_name": title,
                "total_parts": bom.total_parts,
                "entries": [
                    {"part_name": e.part_name, "color_name": e.color_name, "count": e.count}
                    for e in bom.entries
                ],
                "color_summary": bom.color_summary
            }

            pdf_path = str(out_path).replace(".ldr", "_bom.pdf")
            generate_pdf_from_bom_report(bom_dict, pdf_path, mode=mode)
            print(f"    PDF: {pdf_path}")
        except Exception as e:
            print(f"    BOM/PDF 생성 실패: {e}")

    # 결과 출력
    print("\n" + "=" * 60)
    print("변환 결과")
    print("=" * 60)
    print(f"브릭: {len(placements)}개")
    if cap_placements:
        print(f"Cap plates: {len(cap_placements)}개")
    print(f"총 부품: {len(all_placements)}개")
    print(f"부품 종류: {len(brick_counts)}종")
    print(f"안정성 점수: {stability:.1f}/100")
    print(f"\n부품별 수량 (상위 5개):")
    for name, count in sorted(brick_counts.items(), key=lambda x: -x[1])[:5]:
        print(f"  {name}: {count}개")
    print("=" * 60)

    warnings = []
    if mode == "kids" and stability < 70:
        warnings.append("Kids 모드 안정성 미달 - Evolver 보정 필요")

    return ConversionResult(
        placements=all_placements,
        grid_shape=grid.shape,
        total_bricks=len(all_placements),
        brick_counts=brick_counts,
        stability_score=stability,
        color_summary=color_summary,
        warnings=warnings
    )


# =============================================================================
# CLI
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="GLB → LDR 변환기 v3")
    parser.add_argument("input", nargs="?", help="입력 GLB 파일")
    parser.add_argument("output", nargs="?", help="출력 LDR 파일")
    parser.add_argument("--mode", choices=["pro", "kids"], default="pro")
    parser.add_argument("--studs", type=int, default=20, help="목표 스터드 수")
    parser.add_argument("--symmetry", choices=["off", "auto", "x", "z"], default="auto")
    parser.add_argument("--smooth", type=int, default=1, help="색상 스무딩 패스")
    parser.add_argument("--step", choices=["none", "layer", "brick"], default="layer")
    parser.add_argument("--cap", choices=["off", "top", "all"], default="all",
                        help="Cap plates 모드: off=없음, top=최상단만, all=모든 노출면")
    parser.add_argument("--no-bonds", action="store_true", help="연결 최적화 비활성화")
    parser.add_argument("--no-pdf", action="store_true", help="PDF 생성 비활성화")

    args = parser.parse_args()

    if args.input is None:
        # 대화형 모드
        print("=== GLB → LDR 변환기 v3 ===")
        args.input = input("GLB 파일 경로: ").strip().strip('"')
        if not args.input:
            args.input = r"C:\Users\301\Documents\카카오톡 받은 파일\3.glb"

    convert_glb_to_ldr(
        input_path=args.input,
        output_path=args.output,
        mode=args.mode,
        target_studs=args.studs,
        symmetry=args.symmetry,
        color_smooth=args.smooth,
        optimize_bonds=not args.no_bonds,
        step_mode=args.step,
        cap_mode=args.cap,
        generate_bom_pdf=not args.no_pdf
    )


if __name__ == "__main__":
    main()
