import os
import numpy as np
import re
try:
    from .models import Brick, BrickPlan
    from .part_library import get_part_dims
except ImportError:
    from models import Brick, BrickPlan
    from part_library import get_part_dims

class LdrLoader:
    def __init__(self):
        pass

    def load_from_file(self, file_path: str) -> BrickPlan:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"LDR file not found: {file_path}")
            
        bricks = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('0'): # Comment
                    continue
                    
                parts = line.split()
                if not parts: continue
                
                line_type = parts[0]
                
                # Line Type 1: Sub-file reference (The Brick)
                # Format: 1 <colour> x y z a b c d e f g h <file>
                if line_type == '1':
                    # Parse basic info
                    # color = parts[1] # Not used for physics yet
                    
                    # LDraw Coordinates: x, y, z
                    # LDraw Y is Vertical (Down is positive). X, Z are horizontal plane.
                    ldraw_x = float(parts[2])
                    ldraw_y = float(parts[3])
                    ldraw_z = float(parts[4])
                    
                    # Rotation Matrix (a b c / d e f / g h i)
                    # a=5, b=6, c=7, d=8, e=9, f=10, g=11, h=12, i=13
                    rot_matrix = np.array([
                        [float(parts[5]), float(parts[6]), float(parts[7])],
                        [float(parts[8]), float(parts[9]), float(parts[10])],
                        [float(parts[11]), float(parts[12]), float(parts[13])]
                    ])
                    
                    part_id = parts[14]
                    
                    dims = get_part_dims(part_id)
                    if not dims:
                        # Use default 1x1x1 (20x24x20 LDU, origin top-center-ish)
                        dims = (-10.0, 0.0, -10.0, 10.0, 24.0, 10.0)

                    # Unpack 6-tuple from part_library
                    min_x_ldu, min_y_ldu, min_z_ldu, max_x_ldu, max_y_ldu, max_z_ldu = dims

                    # 1. Define corners in Part's Local Space
                    # LDraw Axes: X=Right, Y=Down, Z=Forward
                    corners = [
                        np.array([min_x_ldu, min_y_ldu, min_z_ldu]),
                        np.array([min_x_ldu, min_y_ldu, max_z_ldu]),
                        np.array([min_x_ldu, max_y_ldu, min_z_ldu]),
                        np.array([min_x_ldu, max_y_ldu, max_z_ldu]),
                        np.array([max_x_ldu, min_y_ldu, min_z_ldu]),
                        np.array([max_x_ldu, min_y_ldu, max_z_ldu]),
                        np.array([max_x_ldu, max_y_ldu, min_z_ldu]),
                        np.array([max_x_ldu, max_y_ldu, max_z_ldu]),
                    ]
                    
                    # 2. Transform corners to Global LDraw Space (Rotate + Translate)
                    final_corners_ldraw = []
                    pos_vec = np.array([ldraw_x, ldraw_y, ldraw_z])
                    
                    for c in corners:
                         # Apply Rotation (Matrix * Vector)
                         rc = rot_matrix.dot(c)
                         # Apply Translation
                         final_corners_ldraw.append(rc + pos_vec)

                    # 3. Find Global Extents
                    g_min_x = min(c[0] for c in final_corners_ldraw)
                    g_max_x = max(c[0] for c in final_corners_ldraw)
                    g_min_y = min(c[1] for c in final_corners_ldraw)
                    g_max_y = max(c[1] for c in final_corners_ldraw)
                    g_min_z = min(c[2] for c in final_corners_ldraw)
                    g_max_z = max(c[2] for c in final_corners_ldraw)
                    
                    # 4. Convert to Model System
                    # LDraw X -> Model X (1/20)
                    # LDraw Z -> Model Y (Depth) (1/20)
                    # LDraw Y -> Model Z (Height) (-1/24)
                    
                    model_min_x = g_min_x / 20.0
                    model_max_x = g_max_x / 20.0
                    
                    model_min_y = g_min_z / 20.0
                    model_max_y = g_max_z / 20.0
                    
                    model_min_z = -g_max_y / 24.0 # Inverted
                    model_max_z = -g_min_y / 24.0
                    
                    final_width = model_max_x - model_min_x
                    final_depth = model_max_y - model_min_y
                    final_height = model_max_z - model_min_z
                    
                    brick = Brick(
                        id=f"{part_id}_{len(bricks)}",
                        x=model_min_x,
                        y=model_min_y,
                        z=model_min_z,
                        width=final_width,
                        depth=final_depth,
                        height=final_height
                    )
                    bricks.append(brick)
        
        # Z-Normalization: Shift model to sit on Ground (Z=0)
        if bricks:
            min_model_z = min(b.z for b in bricks)
            if min_model_z > 0.001 or min_model_z < -0.001:
                print(f"Normalizing Z: Shifting model by {-min_model_z:.2f} units.")
                for b in bricks:
                    b.z -= min_model_z
                    
        return BrickPlan(bricks)

