#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GLB -> LDraw (.ldr)
KIDS MODE: large bricks first (2x8~) + symmetry (auto) + door/window heuristic (color block) +
texture/vertex color sampling WITHOUT rtree + quality pass (top cap plates; NOT 1x1-only)

Install:
  pip install trimesh numpy scipy pillow

Usage (CLI):
  python glb_to_ldr.py input.glb output.ldr --auto_studs 14
  python glb_to_ldr.py input.glb output.ldr --pitch 0.02 --cap all --symmetry auto --features auto

Usage (Interactive):
  python glb_to_ldr.py

Tips:
- Too blocky / parts too few -> increase detail:   --auto_studs 14~18  (smaller pitch)
- Too many parts               -> simplify:        --auto_studs 8~12   (bigger pitch)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple, List, Optional, Literal
import argparse
import numpy as np
import trimesh
from scipy.spatial import KDTree

# =========================
# LDraw units / rotations
# =========================
LDU_PER_STUD = 20
LDU_PER_BRICK_H = 24
LDU_PER_PLATE_H = 8

ROT_IDENT = "1 0 0 0 1 0 0 0 1"
ROT_Y90   = "0 0 1 0 1 0 -1 0 0"
ROT_Y180  = "-1 0 0 0 1 0 0 0 -1"
ROT_Y270  = "0 0 -1 0 1 0 1 0 0"


# =========================
# LDraw color palette (subset)
# =========================
LDRAW_COLORS: Dict[int, Tuple[int, int, int]] = {
    0:  (0, 0, 0),           # Black
    1:  (13, 105, 171),      # Blue
    2:  (0, 143, 54),        # Green
    4:  (196, 40, 28),       # Red
    14: (245, 205, 47),      # Yellow
    15: (242, 243, 242),     # White
    19: (215, 197, 153),     # Tan
    25: (218, 133, 65),      # Orange
    71: (163, 162, 164),     # Light Bluish Gray
    72: (99, 95, 98),        # Dark Bluish Gray
}

_COLOR_IDS = list(LDRAW_COLORS.keys())
_COLOR_RGB = np.array([LDRAW_COLORS[i] for i in _COLOR_IDS], dtype=np.float32)
_COLOR_TREE = KDTree(_COLOR_RGB)

def match_ldraw_color(rgb: Tuple[float, float, float]) -> int:
    v = np.array(rgb, dtype=np.float32)
    if v.max() <= 1.0:
        v *= 255.0
    _, idx = _COLOR_TREE.query(v)
    return int(_COLOR_IDS[int(idx)])


# =========================
# Parts: Bricks (3D packing)
# =========================
# IMPORTANT: keep only BRICKS here (height=24). Plates are handled in the cap pass.
BRICK_PARTS_2D = [
    ("3007.dat", (8, 2)),  # Brick 2x8
    ("2456.dat", (6, 2)),  # Brick 2x6
    ("3001.dat", (4, 2)),  # Brick 2x4
    ("3002.dat", (3, 2)),  # Brick 2x3
    ("3003.dat", (2, 2)),  # Brick 2x2
    ("3010.dat", (4, 1)),  # Brick 1x4
    ("3622.dat", (3, 1)),  # Brick 1x3
    ("3004.dat", (2, 1)),  # Brick 1x2
    ("3005.dat", (1, 1)),  # Brick 1x1 (last resort)
]

# =========================
# Parts: Plates (top-cap quality pass)
# =========================
PLATE_PARTS_2D = [
    ("3020.dat", (4, 2)),  # Plate 2x4
    ("3021.dat", (3, 2)),  # Plate 2x3
    ("3022.dat", (2, 2)),  # Plate 2x2
    ("3710.dat", (4, 1)),  # Plate 1x4
    ("3623.dat", (3, 1)),  # Plate 1x3
    ("3023.dat", (2, 1)),  # Plate 1x2
    ("3024.dat", (1, 1)),  # Plate 1x1 (only if needed)
]

# =========================
# Feature parts (heuristic)
# =========================
DEFAULT_DOOR_PART = "60596.dat"     # door/doorframe family (availability varies)
DEFAULT_WINDOW_PART = "60593.dat"   # window frame (availability varies)


# =========================
# Data structures
# =========================
@dataclass
class VoxelData:
    occ: np.ndarray      # (nx, ny, nz) bool
    cid: np.ndarray      # (nx, ny, nz) int16; -1 empty
    pitch: float

@dataclass
class FeaturePlacement:
    part: str
    color_id: int
    x: int
    y: int
    z: int
    rot: str

@dataclass
class PackedPlacement:
    part: str
    color_id: int
    x: int
    y: int
    z: int
    rot: str


# =========================
# GLB load helpers
# =========================
def load_scene(glb_path: Path) -> trimesh.Scene:
    obj = trimesh.load(glb_path.as_posix(), force="scene")
    if isinstance(obj, trimesh.Scene):
        return obj
    sc = trimesh.Scene()
    sc.add_geometry(obj)
    return sc

def iter_meshes(scene: trimesh.Scene) -> List[trimesh.Trimesh]:
    out: List[trimesh.Trimesh] = []
    for _, g in scene.geometry.items():
        if isinstance(g, trimesh.Trimesh) and g.vertices is not None and len(g.vertices) > 0:
            out.append(g)
    return out

def auto_pitch_for_target_width(scene: trimesh.Scene, target_studs: int = 14) -> float:
    meshes = iter_meshes(scene)
    if not meshes:
        return 0.02
    combined = trimesh.util.concatenate(meshes)
    bounds = combined.bounds
    size = bounds[1] - bounds[0]
    max_dim = float(np.max(size))
    if max_dim <= 0:
        return 0.02
    return max_dim / float(target_studs)


# =========================
# Texture/PBR color sampling WITHOUT rtree
# voxel centers -> nearest FACE centroid -> sample face color
# try uv_to_color if texture exists, else vertex/base color
# =========================
def _get_texture_image(mesh: trimesh.Trimesh):
    mat = getattr(mesh.visual, "material", None)
    if mat is None:
        return None
    return getattr(mat, "image", None)

def _face_uv_centroid(mesh: trimesh.Trimesh) -> Optional[np.ndarray]:
    uv = getattr(mesh.visual, "uv", None)
    if uv is None:
        return None
    f = mesh.faces
    uvf = uv[f]               # (F,3,2)
    return uvf.mean(axis=1)   # (F,2)

def _face_centroids(mesh: trimesh.Trimesh) -> np.ndarray:
    return mesh.triangles_center.astype(np.float32)

def _sample_face_colors_from_texture(mesh: trimesh.Trimesh) -> Optional[np.ndarray]:
    img = _get_texture_image(mesh)
    uvc = _face_uv_centroid(mesh)
    if img is None or uvc is None:
        return None
    rgba = trimesh.visual.color.uv_to_color(uvc, img)  # (F,4) uint8
    return np.asarray(rgba[:, :3], dtype=np.float32)   # (F,3) 0..255

def _fallback_face_colors(mesh: trimesh.Trimesh) -> np.ndarray:
    vc = getattr(mesh.visual, "vertex_colors", None)
    if vc is not None and len(vc) > 0:
        c = np.asarray(vc, dtype=np.float32)
        if c.shape[1] >= 3:
            rgb = c[:, :3]
            if rgb.max() <= 1.0:
                rgb = rgb * 255.0
            faces = mesh.faces
            return rgb[faces].mean(axis=1).astype(np.float32)

    mat = getattr(mesh.visual, "material", None)
    if mat is not None:
        bcf = getattr(mat, "baseColorFactor", None)
        if bcf is not None and len(bcf) >= 3:
            col = np.array([bcf[0], bcf[1], bcf[2]], dtype=np.float32)
            if col.max() <= 1.0:
                col *= 255.0
            return np.tile(col, (len(mesh.faces), 1))

    return np.tile(np.array([160, 160, 160], dtype=np.float32), (len(mesh.faces), 1))

def voxelize_and_color(scene: trimesh.Scene, pitch: float) -> VoxelData:
    meshes = iter_meshes(scene)
    if not meshes:
        raise ValueError("No meshes in GLB.")
    combined = trimesh.util.concatenate(meshes)

    vg = trimesh.voxel.creation.voxelize(combined, pitch=pitch)
    if vg.points is None or len(vg.points) == 0:
        raise ValueError("Voxelization produced 0 voxels. Increase pitch or rescale model.")

    occ = vg.matrix.astype(bool)
    nx, ny, nz = occ.shape

    filled_idx = np.array(vg.sparse_indices, dtype=int)  # (N,3)
    centers = np.asarray(vg.points, dtype=np.float32)    # (N,3)

    face_colors = _sample_face_colors_from_texture(combined)
    if face_colors is None:
        face_colors = _fallback_face_colors(combined)

    face_centroids = _face_centroids(combined)
    f_tree = KDTree(face_centroids)
    _, f_idx = f_tree.query(centers)
    rgb = face_colors[np.asarray(f_idx, dtype=int)]

    cids = np.array([match_ldraw_color(tuple(rgb[i])) for i in range(rgb.shape[0])], dtype=np.int16)

    cid_grid = np.full((nx, ny, nz), -1, dtype=np.int16)
    cid_grid[filled_idx[:, 0], filled_idx[:, 1], filled_idx[:, 2]] = cids

    return VoxelData(occ=occ, cid=cid_grid, pitch=float(pitch))


# =========================
# Color smoothing (reduce texture noise so big bricks form)
# =========================
def smooth_colors(vox: VoxelData, passes: int = 1) -> None:
    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape
    for _ in range(passes):
        new = cid.copy()
        for x in range(nx):
            for y in range(ny):
                for z in range(nz):
                    if not occ[x, y, z]:
                        continue
                    vals = []
                    for dx, dy, dz in ((0,0,0),(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)):
                        xx, yy, zz = x+dx, y+dy, z+dz
                        if 0 <= xx < nx and 0 <= yy < ny and 0 <= zz < nz and occ[xx, yy, zz]:
                            v = int(cid[xx, yy, zz])
                            if v >= 0:
                                vals.append(v)
                    if len(vals) >= 3:
                        u, c = np.unique(np.array(vals), return_counts=True)
                        new[x, y, z] = int(u[np.argmax(c)])
        cid[:, :, :] = new


# =========================
# Symmetry detection + enforcement
# =========================
def _symmetry_score(occ: np.ndarray, axis: Literal["x", "z"]) -> float:
    nx, ny, nz = occ.shape
    if axis == "x":
        a = occ[: nx//2, :, :]
        b = occ[nx - nx//2 :, :, :][::-1, :, :]
    else:
        a = occ[:, :, : nz//2]
        b = occ[:, :, nz - nz//2 :][:, :, ::-1]
    if a.size == 0 or b.size == 0:
        return 1.0
    return float(np.mean(a == b))

def enforce_symmetry(vox: VoxelData, axis: Literal["x", "z"], mode: Literal["mirror_union", "mirror_intersection"] = "mirror_union") -> None:
    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape

    def merge_color(a: int, b: int) -> int:
        if a < 0 and b >= 0: return b
        if b < 0 and a >= 0: return a
        if a >= 0 and b >= 0: return a
        return -1

    if axis == "x":
        for x in range(nx//2):
            mx = nx - 1 - x
            if mode == "mirror_union":
                occ_pair = occ[x, :, :] | occ[mx, :, :]
            else:
                occ_pair = occ[x, :, :] & occ[mx, :, :]
            occ[x, :, :] = occ_pair
            occ[mx, :, :] = occ_pair

            left = cid[x, :, :]
            right = cid[mx, :, :]
            merged = left.copy()
            for y in range(ny):
                for z in range(nz):
                    if not occ_pair[y, z]:
                        merged[y, z] = -1
                    else:
                        merged[y, z] = merge_color(int(left[y, z]), int(right[y, z]))
            cid[x, :, :] = merged
            cid[mx, :, :] = merged
    else:
        for z in range(nz//2):
            mz = nz - 1 - z
            if mode == "mirror_union":
                occ_pair = occ[:, :, z] | occ[:, :, mz]
            else:
                occ_pair = occ[:, :, z] & occ[:, :, mz]
            occ[:, :, z] = occ_pair
            occ[:, :, mz] = occ_pair

            front = cid[:, :, z]
            back = cid[:, :, mz]
            merged = front.copy()
            for x in range(nx):
                for y in range(ny):
                    if not occ_pair[x, y]:
                        merged[x, y] = -1
                    else:
                        merged[x, y] = merge_color(int(front[x, y]), int(back[x, y]))
            cid[:, :, z] = merged
            cid[:, :, mz] = merged


# =========================
# Feature detection (Door/Window heuristic)
#   - find big non-body color block on an exterior face near bottom
#   - carve hole and place a feature part
# =========================
def _exterior_mask(occ: np.ndarray) -> np.ndarray:
    nx, ny, nz = occ.shape
    ext = np.zeros_like(occ, dtype=bool)
    for x in range(nx):
        for y in range(ny):
            for z in range(nz):
                if not occ[x, y, z]:
                    continue
                for dx, dy, dz in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)):
                    xx, yy, zz = x+dx, y+dy, z+dz
                    if not (0 <= xx < nx and 0 <= yy < ny and 0 <= zz < nz) or not occ[xx, yy, zz]:
                        ext[x, y, z] = True
                        break
    return ext

def _dominant(vals: np.ndarray, fallback: int = 71) -> int:
    v = vals[vals >= 0]
    if v.size == 0:
        return fallback
    u, c = np.unique(v, return_counts=True)
    return int(u[np.argmax(c)])

def detect_feature_candidate(
    vox: VoxelData,
    bottom_layers: int = 7,
    min_area: int = 6
) -> Optional[Tuple[str, int, Tuple[int,int,int,int]]]:
    """
    Returns (face, color_id, bbox(u0,v0,u1,v1))
    face in {"front","back","left","right"}
    front/back: u=x, v=y  (z fixed)
    left/right: u=z, v=y  (x fixed)
    """
    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape
    ext = _exterior_mask(occ)

    body_color = _dominant(cid[ext], fallback=71)
    y_max = min(bottom_layers - 1, ny - 1)

    candidates = []

    def score_bbox(count: int, u0: int, v0: int, u1: int, v1: int) -> float:
        area = (u1-u0+1) * (v1-v0+1)
        if area <= 0:
            return 0.0
        fill = count / area
        h = (v1-v0+1)
        w = (u1-u0+1)
        aspect = 1.0
        if h >= 4 and w <= 5:
            aspect = 1.35
        return area * fill * aspect

    def eval_face(face: str):
        if face == "front":
            z = 0
            mask = ext[:, :y_max+1, z]
            colors = cid[:, :y_max+1, z]
            is_frontback = True
        elif face == "back":
            z = nz - 1
            mask = ext[:, :y_max+1, z]
            colors = cid[:, :y_max+1, z]
            is_frontback = True
        elif face == "left":
            x = 0
            mask = ext[x, :y_max+1, :]
            colors = cid[x, :y_max+1, :]
            is_frontback = False
        else:  # right
            x = nx - 1
            mask = ext[x, :y_max+1, :]
            colors = cid[x, :y_max+1, :]
            is_frontback = False

        face_vals = colors[mask]
        face_vals = face_vals[(face_vals >= 0) & (face_vals != body_color)]
        if face_vals.size == 0:
            return

        uniq, cnt = np.unique(face_vals, return_counts=True)
        order = np.argsort(-cnt)[:4]
        for ci in uniq[order]:
            ci = int(ci)
            coords = np.argwhere(mask & (colors == ci))
            if coords.size == 0:
                continue

            if is_frontback:
                xs = coords[:, 0]
                ys = coords[:, 1]
                u0, u1 = int(xs.min()), int(xs.max())
                v0, v1 = int(ys.min()), int(ys.max())
            else:
                ys = coords[:, 0]
                zs = coords[:, 1]
                u0, u1 = int(zs.min()), int(zs.max())
                v0, v1 = int(ys.min()), int(ys.max())

            area = (u1-u0+1) * (v1-v0+1)
            if area < min_area:
                continue

            sc = score_bbox(int(coords.shape[0]), u0, v0, u1, v1)
            candidates.append((sc, face, ci, (u0, v0, u1, v1)))

    for f in ("front", "back", "left", "right"):
        eval_face(f)

    if not candidates:
        return None
    candidates.sort(key=lambda t: t[0], reverse=True)
    _, face, ci, bbox = candidates[0]
    return (face, ci, bbox)

def cut_hole_for_bbox(
    vox: VoxelData,
    face: str,
    bbox: Tuple[int,int,int,int],
    height: int = 6,
    depth: int = 1,
) -> Tuple[int,int,int,int,int,int]:
    """
    Carve a rectangular prism hole from the voxel grid for a feature.
    Returns voxel-space box (x0,x1,y0,y1,z0,z1) inclusive.
    """
    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape
    u0, v0, u1, _v1 = bbox

    y0 = v0
    y1 = min(v0 + height - 1, ny - 1)

    if face in ("front", "back"):
        x0, x1 = u0, u1
        if face == "front":
            z0 = 0
            z1 = min(depth - 1, nz - 1)
        else:
            z1 = nz - 1
            z0 = max(nz - depth, 0)
    else:
        z0, z1 = u0, u1
        if face == "left":
            x0 = 0
            x1 = min(depth - 1, nx - 1)
        else:
            x1 = nx - 1
            x0 = max(nx - depth, 0)

    occ[x0:x1+1, y0:y1+1, z0:z1+1] = False
    cid[x0:x1+1, y0:y1+1, z0:z1+1] = -1
    return (x0, x1, y0, y1, z0, z1)

def feature_part_from_hole(
    hole: Tuple[int,int,int,int,int,int],
    shape: Tuple[int,int,int],
    face: str,
    part: str,
    color_id: int
) -> FeaturePlacement:
    nx, ny, nz = shape
    x0, x1, y0, y1, z0, z1 = hole

    cx = (nx - 1) / 2.0
    cz = (nz - 1) / 2.0

    # place at hole center in studs
    sx = ((x0 + x1) / 2.0) - cx
    sz = ((z0 + z1) / 2.0) - cz

    # put on bottom at y0 layer (brick bottom convention)
    Y = int(round(-(y0 * LDU_PER_BRICK_H)))

    X = int(round(sx * LDU_PER_STUD))
    Z = int(round(sz * LDU_PER_STUD))

    if face == "front":
        rot = ROT_IDENT
    elif face == "back":
        rot = ROT_Y180
    elif face == "left":
        rot = ROT_Y90
    else:
        rot = ROT_Y270

    return FeaturePlacement(part=part, color_id=color_id, x=X, y=Y, z=Z, rot=rot)


# =========================
# Packing: 3D greedy (bricks) + 2D cap plates
# =========================
def dominant_color(block: np.ndarray) -> int:
    v = block[block >= 0]
    if v.size == 0:
        return 71
    u, c = np.unique(v, return_counts=True)
    return int(u[np.argmax(c)])

def greedy_brick_packing(vox: VoxelData) -> List[Tuple[str, int, int, int, int, int]]:
    """
    Layer-by-layer greedy packing using BRICKS ONLY.
    Returns tuples: (part_id, color_id, x, y, z, rot_flag)
    rot_flag: 0 = identity, 1 = rotated 90deg footprint
    """
    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape
    used = np.zeros_like(occ, dtype=bool)
    placements: List[Tuple[str, int, int, int, int, int]] = []

    def can_place(x: int, y: int, z: int, w: int, d: int) -> bool:
        if x + w > nx or z + d > nz:
            return False
        if not occ[x:x+w, y, z:z+d].all():
            return False
        if used[x:x+w, y, z:z+d].any():
            return False
        # support rule: footprint must have filled voxels below (unless bottom layer)
        if y > 0 and not occ[x:x+w, y-1, z:z+d].all():
            return False
        return True

    for y in range(ny):  # bottom -> top
        for z in range(nz):
            for x in range(nx):
                if not occ[x, y, z] or used[x, y, z]:
                    continue

                placed = False
                for part_id, (w0, d0) in BRICK_PARTS_2D:
                    orientations = [(w0, d0, 0)]
                    if (w0, d0) != (d0, w0):
                        orientations.append((d0, w0, 1))

                    for w, d, rot_flag in orientations:
                        if can_place(x, y, z, w, d):
                            color_id = dominant_color(cid[x:x+w, y, z:z+d])
                            used[x:x+w, y, z:z+d] = True
                            placements.append((part_id, color_id, x, y, z, rot_flag))
                            placed = True
                            break
                    if placed:
                        break

                if not placed:
                    used[x, y, z] = True  # safeguard

    return placements

def _top_surface_map(occ: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    For each (x,z), compute y_top (highest filled y index) and whether it is exposed (no voxel above).
    Returns:
      y_top: (nx,nz) int, -1 if empty
      exposed: (nx,nz) bool
    """
    nx, ny, nz = occ.shape
    y_top = np.full((nx, nz), -1, dtype=int)
    exposed = np.zeros((nx, nz), dtype=bool)
    for x in range(nx):
        for z in range(nz):
            ys = np.where(occ[x, :, z])[0]
            if ys.size == 0:
                continue
            yt = int(ys.max())
            y_top[x, z] = yt
            if yt == ny - 1 or not occ[x, yt + 1, z]:
                exposed[x, z] = True
    return y_top, exposed

def greedy_2d_packing(mask: np.ndarray, color_grid: np.ndarray, parts_2d: List[Tuple[str, Tuple[int,int]]]) -> List[Tuple[str, int, int, int, int]]:
    """
    2D greedy packing on (x,z) plane.
    mask: (nx,nz) bool indicates cells to fill
    color_grid: (nx,nz) int16 (ldraw color id for each cell)
    returns: (part_id, color_id, x, z, rot_flag)
    """
    nx, nz = mask.shape
    used = np.zeros_like(mask, dtype=bool)
    out: List[Tuple[str, int, int, int, int]] = []

    def can_place(x: int, z: int, w: int, d: int) -> bool:
        if x + w > nx or z + d > nz:
            return False
        region = mask[x:x+w, z:z+d]
        if not region.all():
            return False
        if used[x:x+w, z:z+d].any():
            return False
        return True

    for z in range(nz):
        for x in range(nx):
            if not mask[x, z] or used[x, z]:
                continue
            placed = False
            for part_id, (w0, d0) in parts_2d:
                orientations = [(w0, d0, 0)]
                if (w0, d0) != (d0, w0):
                    orientations.append((d0, w0, 1))

                for w, d, rot_flag in orientations:
                    if can_place(x, z, w, d):
                        col = dominant_color(color_grid[x:x+w, z:z+d])
                        used[x:x+w, z:z+d] = True
                        out.append((part_id, col, x, z, rot_flag))
                        placed = True
                        break
                if placed:
                    break
            if not placed:
                used[x, z] = True
    return out

def cap_with_plates(
    vox: VoxelData,
    cap_mode: Literal["off", "top", "all"] = "all",
    min_patch_area: int = 2
) -> List[Tuple[str, int, int, int, int, int]]:
    """
    Add a quality pass by placing PLATES on exposed top surfaces.
    Returns plate placements in LDraw grid-space tuples:
      (part_id, color_id, x, y_level, z, rot_flag)
    y_level is the voxel y index of the surface being capped (plate sits above that layer).
    """
    if cap_mode == "off":
        return []

    occ, cid = vox.occ, vox.cid
    nx, ny, nz = occ.shape
    y_top, exposed = _top_surface_map(occ)

    if cap_mode == "top":
        # cap only the global highest exposed surface (often roof ridge)
        valid = y_top[exposed]
        if valid.size == 0:
            return []
        target_y = int(valid.min())  # "highest" in our indexing means smaller? here y increases upward, but LDraw uses negative.
        # Actually in voxel index, larger y is higher. We want the maximum y_top.
        target_y = int(valid.max())
        layers = [target_y]
    else:
        layers = sorted(list(set(int(v) for v in y_top[exposed].ravel() if v >= 0)))

    plate_placements: List[Tuple[str, int, int, int, int, int]] = []

    for yl in layers:
        mask = (exposed & (y_top == yl))
        if mask.sum() < min_patch_area:
            continue

        # color grid for this cap layer: use cid at (x,yl,z)
        color_grid = np.full((nx, nz), -1, dtype=np.int16)
        for x in range(nx):
            for z in range(nz):
                if mask[x, z]:
                    color_grid[x, z] = cid[x, yl, z]

        packed2d = greedy_2d_packing(mask, color_grid, PLATE_PARTS_2D)
        for part_id, col, x, z, rot_flag in packed2d:
            plate_placements.append((part_id, int(col), int(x), int(yl), int(z), int(rot_flag)))

    return plate_placements


# =========================
# LDraw export
# =========================
def _place_part_centered(
    part_id: str,
    color_id: int,
    x: int, y: int, z: int,
    w: int, d: int,
    rot_flag: int,
    shape: Tuple[int,int,int],
    bottom_y_ldu: int,
    is_plate: bool = False
) -> PackedPlacement:
    nx, ny, nz = shape
    cx = (nx - 1) / 2.0
    cz = (nz - 1) / 2.0

    if rot_flag == 1:
        rot = ROT_Y90
        w_eff, d_eff = d, w
    else:
        rot = ROT_IDENT
        w_eff, d_eff = w, d

    sx = (x + (w_eff - 1) / 2.0) - cx
    sz = (z + (d_eff - 1) / 2.0) - cz

    X = int(round(sx * LDU_PER_STUD))
    Z = int(round(sz * LDU_PER_STUD))
    Y = int(bottom_y_ldu)

    return PackedPlacement(part=part_id, color_id=int(color_id), x=X, y=Y, z=Z, rot=rot)

def placements_to_ldr(
    brick_place: List[Tuple[str, int, int, int, int, int]],
    plate_caps: List[Tuple[str, int, int, int, int, int]],
    features: List[FeaturePlacement],
    shape: Tuple[int, int, int],
    title: str
) -> str:
    out: List[str] = []
    out.append(f"0 {title}")
    out.append("0 NOTE: Brick/plate origins assumed standard: bottom at y=0; higher layers use negative Y (LDraw Y+ is down).")
    out.append("0")

    # BRICKS
    for part_id, color_id, x, y, z, rot_flag in brick_place:
        spec = next((s for s in BRICK_PARTS_2D if s[0] == part_id), None)
        w, d = spec[1] if spec else (1, 1)
        bottom_y_ldu = int(round(-(y * LDU_PER_BRICK_H)))  # layer y => bottom at -y*24
        p = _place_part_centered(part_id, color_id, x, y, z, w, d, rot_flag, shape, bottom_y_ldu, is_plate=False)
        out.append(f"1 {p.color_id} {p.x} {p.y} {p.z} {p.rot} {p.part}")

    # PLATE CAPS (sit on TOP of the brick layer yl)
    for part_id, color_id, x, yl, z, rot_flag in plate_caps:
        spec = next((s for s in PLATE_PARTS_2D if s[0] == part_id), None)
        w, d = spec[1] if spec else (1, 1)
        # plate bottom sits at top of brick layer: bottom_y = -yl*24 -24
        bottom_y_ldu = int(round(-(yl * LDU_PER_BRICK_H) - LDU_PER_BRICK_H))
        p = _place_part_centered(part_id, color_id, x, yl, z, w, d, rot_flag, shape, bottom_y_ldu, is_plate=True)
        out.append(f"1 {p.color_id} {p.x} {p.y} {p.z} {p.rot} {p.part}")

    # FEATURES
    for f in features:
        out.append(f"1 {int(f.color_id)} {int(f.x)} {int(f.y)} {int(f.z)} {f.rot} {f.part}")

    return "\n".join(out) + "\n"


# =========================
# Main pipeline
# =========================
def generate_optimized_ldr(
    glb_path: str,
    output_path: str,
    pitch: float = 0.02,
    auto_studs: Optional[int] = None,
    symmetry: Literal["off", "auto", "x", "z"] = "auto",
    features: Literal["off", "auto"] = "auto",
    cap: Literal["off", "top", "all"] = "all",
    color_smooth_passes: int = 1,
    door_part: str = DEFAULT_DOOR_PART,
    window_part: str = DEFAULT_WINDOW_PART,
) -> None:
    in_path = Path(glb_path).expanduser().resolve()
    out_path = Path(output_path).expanduser().resolve()
    if not in_path.exists():
        raise FileNotFoundError(f"GLB not found: {in_path}")

    scene = load_scene(in_path)
    if auto_studs is not None:
        pitch = auto_pitch_for_target_width(scene, target_studs=auto_studs)

    vox = voxelize_and_color(scene, pitch=pitch)

    if color_smooth_passes > 0:
        smooth_colors(vox, passes=color_smooth_passes)

    # symmetry
    if symmetry != "off":
        if symmetry == "auto":
            sx = _symmetry_score(vox.occ, "x")
            sz = _symmetry_score(vox.occ, "z")
            if max(sx, sz) >= 0.92:
                enforce_symmetry(vox, axis=("x" if sx >= sz else "z"), mode="mirror_union")
        else:
            enforce_symmetry(vox, axis=symmetry, mode="mirror_union")

    feature_list: List[FeaturePlacement] = []

    # feature heuristic (single best block): choose door-like if tall; else window-like
    if features == "auto":
        cand = detect_feature_candidate(vox, bottom_layers=7, min_area=6)
        if cand is not None:
            face, color_id, bbox = cand
            u0, v0, u1, v1 = bbox
            h = (v1 - v0 + 1)
            w = (u1 - u0 + 1)
            part = door_part if (h >= 4 and w >= 1) else window_part
            hole = cut_hole_for_bbox(vox, face=face, bbox=bbox, height=min(6, h), depth=1)
            feature_list.append(feature_part_from_hole(hole, vox.occ.shape, face, part, int(color_id)))

    # pack bricks (3D)
    brick_place = greedy_brick_packing(vox)

    # quality: cap plates
    plate_caps = cap_with_plates(vox, cap_mode=cap, min_patch_area=2)

    ldr = placements_to_ldr(
        brick_place=brick_place,
        plate_caps=plate_caps,
        features=feature_list,
        shape=vox.occ.shape,
        title="GLB->LDraw KIDS (Big Bricks + Cap Plates + Symmetry + Feature)"
    )
    out_path.write_text(ldr, encoding="utf-8")

    # report
    counts: Dict[str, int] = {}
    for p, *_ in brick_place:
        counts[p] = counts.get(p, 0) + 1
    for p, *_ in plate_caps:
        counts[p] = counts.get(p, 0) + 1
    for f in feature_list:
        counts[f.part] = counts.get(f.part, 0) + 1

    print(f"OK: wrote {out_path}")
    print(f"Pitch: {pitch:.6f} (auto_studs={auto_studs})")
    print(f"Symmetry: {symmetry}, Features: {features}, Cap: {cap}, ColorSmooth: {color_smooth_passes}")
    print("Total parts:", len(brick_place) + len(plate_caps) + len(feature_list))
    print("Part counts:", counts)


# =========================
# CLI / Interactive
# =========================
def _ask(prompt: str, default: str) -> str:
    s = input(prompt).strip().strip('"').strip("'")
    return s if s else default

def _interactive():
    print("=== GLB -> LDR (KIDS: Big Bricks + Cap Plates + Symmetry + Feature) ===")
    glb = _ask("GLB path (Enter=input.glb): ", "input.glb")
    out = _ask("Output LDR (Enter=model.ldr): ", "model.ldr")

    mode = _ask("Mode: (1) auto width studs, (2) manual pitch  [Enter=1]: ", "1")
    sym = _ask("Symmetry: off/auto/x/z  [Enter=auto]: ", "auto")
    feat = _ask("Features: off/auto  [Enter=auto]: ", "auto")
    cap = _ask("Cap plates: off/top/all  [Enter=all]: ", "all")
    smooth = int(_ask("Color smooth passes (Enter=1): ", "1"))

    if mode == "2":
        pitch = float(_ask("Pitch (Enter=0.02): ", "0.02"))
        generate_optimized_ldr(glb, out, pitch=pitch, auto_studs=None, symmetry=sym, features=feat, cap=cap, color_smooth_passes=smooth)
    else:
        studs = int(_ask("Target width in studs (Enter=14): ", "14"))
        generate_optimized_ldr(glb, out, pitch=0.02, auto_studs=studs, symmetry=sym, features=feat, cap=cap, color_smooth_passes=smooth)

def main():
    import sys
    if len(sys.argv) == 1:
        _interactive()
        return

    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="input .glb")
    ap.add_argument("output", help="output .ldr")
    ap.add_argument("--pitch", type=float, default=0.02, help="voxel pitch (mesh units)")
    ap.add_argument("--auto_studs", type=int, default=None, help="auto pitch to fit ~N studs wide (e.g., 14)")
    ap.add_argument("--symmetry", choices=["off", "auto", "x", "z"], default="auto")
    ap.add_argument("--features", choices=["off", "auto"], default="auto")
    ap.add_argument("--cap", choices=["off", "top", "all"], default="all", help="add plate caps to increase LEGO-like detail")
    ap.add_argument("--color_smooth", type=int, default=1, help="color smoothing passes (0=off)")
    ap.add_argument("--door_part", type=str, default=DEFAULT_DOOR_PART)
    ap.add_argument("--window_part", type=str, default=DEFAULT_WINDOW_PART)
    args = ap.parse_args()

    generate_optimized_ldr(
        glb_path=args.input,
        output_path=args.output,
        pitch=args.pitch,
        auto_studs=args.auto_studs,
        symmetry=args.symmetry,   # type: ignore
        features=args.features,   # type: ignore
        cap=args.cap,             # type: ignore
        color_smooth_passes=max(0, int(args.color_smooth)),
        door_part=args.door_part,
        window_part=args.window_part,
    )

if __name__ == "__main__":
    main()
