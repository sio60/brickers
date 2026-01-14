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
                        # Use default size (1x1x1) instead of skipping
                        # This maintains structural connectivity
                        print(f"Warning: Unknown part ID '{part_id}', using default size 1x1x1.")
                        dims = (1, 1, 1.0)
                        
                    width_studs, depth_studs, height_bricks = dims
                    
                    # Convert Units
                    # 1 Stud = 20 LDU
                    # 1 Brick Height = 24 LDU
                    
                    # Transform Position to Model System (Studs for X/Y, BrickHeight for Z)
                    # Model X = LDraw X / 20
                    # Model Y (Depth) = LDraw Z / 20  <-- We map LDraw Z to Model Y
                    # Model Z (Height) = -LDraw Y / 24 <-- LDraw Y is down positive, so -Y is up.
                    
                    model_x = ldraw_x / 20.0
                    model_depth_y = ldraw_z / 20.0
                    model_z = -ldraw_y / 24.0
                    
                    # Handle Rotation (Simple Axis Aligned)
                    # If rotated 90 deg around vertical axis (LDraw Y axis), swap width/depth.
                    # LDraw Y axis is the up/down axis.
                    # Check rotation of the X-basis vector (first column of matrix approx?)
                    # Or transform a logical vector (1,0,0) and see where it lands.
                    
                    # Local width vector (1, 0, 0)
                    local_w = np.array([1, 0, 0])
                    rotated_w = rot_matrix.dot(local_w)
                    
                    # If rotated_w has strong Z component (Model Y), then width and depth are swapped in projection
                    # LDraw Axes: 
                    # X (side), Y (up/down), Z (front/back)
                    
                    # If X-axis vector points to Z after rotation, then dimensions are swapped relative to world X/Z
                    final_width = width_studs
                    final_depth = depth_studs
                    
                    if abs(rotated_w[2]) > 0.9: # Rotated 90 degrees around Y
                        final_width, final_depth = final_depth, final_width
                        
                    # Calculate 'Corner' position
                    # LDraw position is usually the Center of the connection stud surface? 
                    # Or center of part?
                    # Most bricks: Origin is center of top studs or bottom tubes.
                    # For 3001 (2x4): Origin is center.
                    # Hence (x,y) in model is usually center-based. 
                    # But our `Brick` model assumes (x,y,z) is MIN CORNER (bottom-left-front)?
                    # let's check `models.py`.
                    # Brick.center_of_mass = x + width/2 ...
                    # So Brick.x is min corner.
                    
                    # Convert COM/Center to Min Corner
                    min_x = model_x - (final_width / 2.0)
                    min_y = model_depth_y - (final_depth / 2.0)
                    
                    # LDraw Y origin is usually at the typical 'ground' level of the brick or top?
                    # Standard brick origin is at the bottom center. (Usually)
                    # So Model Z is bottom z.
                    # Check this assumption with LDraw standard.
                    # Actually standard parts origin varies.
                    # Assuming Bottom Center for standard bricks.
                    min_z = model_z # already bottom if origin is bottom.
                    
                    brick = Brick(
                        id=f"{part_id}_{len(bricks)}",
                        x=min_x,
                        y=min_y,
                        z=min_z,
                        width=final_width,
                        depth=final_depth,
                        height=height_bricks
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

