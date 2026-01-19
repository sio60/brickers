import os
import math

# Global cache for part dimensions
DIMENSION_CACHE = {}

# Path to LDraw Library
# Assuming running from 'physical_verification' folder, so we go up to frontend...
# Or absolute path for safety in this environment
LDRAW_LIB_PATH = r"c:\Users\301\Desktop\brickers\frontend\complete\ldraw"
PARTS_DIR = os.path.join(LDRAW_LIB_PATH, "parts")
P_DIR = os.path.join(LDRAW_LIB_PATH, "p")

def resolve_file_path(filename):
    """
    Finds the absolute path of a .dat file.
    Checks 'parts' first, then 'p'.
    Handles backslashes/forward slashes.
    """
    filename = filename.replace("\\", os.sep).replace("/", os.sep)
    
    # Check parts
    path = os.path.join(PARTS_DIR, filename)
    if os.path.exists(path):
        return path
        
    # Check p (primitives)
    path = os.path.join(P_DIR, filename)
    if os.path.exists(path):
        return path
        
    # Some subfiles might be relative to LDRAW root (rare, but possible)
    # usually they are just 's\file.dat' which is inside parts/s/file.dat
    # or '4-4cyli.dat' which is inside p/4-4cyli.dat
    
    # Try case-insensitive search if direct not found (Windows is case-insensitive usually, but good to be robust)
    # For now relying on OS case insensitivity for Windows.
    return None

def parse_ldraw_part(part_id, depth=0, max_depth=3, accumulated_matrix=None):
    """
    Parses a .dat file to calculate a bounding box.
    Returns (min_x, min_y, min_z, max_x, max_y, max_z).
    LDraw Coords: Y is down.
    """
    if part_id in DIMENSION_CACHE and depth == 0:
        # If we Cached the FINAL dimensions (width, depth, height), we can't use it here directly
        # because this function returns raw coordinates. 
        # But we can cache the raw bbox for the part_id.
        pass

    # Simple Identity Matrix if None
    if accumulated_matrix is None:
        accumulated_matrix = [
             [1, 0, 0, 0],
             [0, 1, 0, 0],
             [0, 0, 1, 0],
             [0, 0, 0, 1]
        ]

    file_path = resolve_file_path(part_id)
    if not file_path:
        # print(f"Warning: Could not file {part_id}")
        return None

    min_x, min_y, min_z = float('inf'), float('inf'), float('inf')
    max_x, max_y, max_z = float('-inf'), float('-inf'), float('-inf')
    
    found_geometry = False

    try:
        with open(file_path, 'r', encoding='latin-1') as f: # LDraw uses latin-1 usually
            for line in f:
                line = line.strip()
                if not line or line.startswith('0'): continue
                
                parts = line.split()
                if not parts: continue
                
                line_type = parts[0]
                
                # Type 1: Sub-file reference
                if line_type == '1':
                    if depth >= max_depth: continue
                    
                    # 1 <colour> x y z a b c d e f g h <file>
                    try:
                        sub_x, sub_y, sub_z = float(parts[2]), float(parts[3]), float(parts[4])
                        # Rotation 3x3
                        a, b, c = float(parts[5]), float(parts[6]), float(parts[7])
                        d, e, f = float(parts[8]), float(parts[9]), float(parts[10])
                        g, h, i = float(parts[11]), float(parts[12]), float(parts[13])
                        sub_file = " ".join(parts[14:]) # Filename might have spaces
                        
                        # Apply current matrix to this transformation
                        # This constitutes a scene graph traversal.
                        # For Bounding Box, effectively we can just calculate the bbox of the subpart 
                        # and transform its 8 corners by this matrix, then merge.
                        
                        # Recurse
                        # Optimization: Just getting raw bbox of subpart then transforming *that* is faster 
                        # than passing matrix down if we cache subpart bboxes.
                        sub_bbox = get_raw_bbox(sub_file, depth + 1, max_depth)
                        
                        if sub_bbox:
                            s_min_x, s_min_y, s_min_z, s_max_x, s_max_y, s_max_z = sub_bbox
                            
                            # Transform 8 corners of the sub-bbox
                            corners = [
                                (s_min_x, s_min_y, s_min_z), (s_min_x, s_min_y, s_max_z),
                                (s_min_x, s_max_y, s_min_z), (s_min_x, s_max_y, s_max_z),
                                (s_max_x, s_min_y, s_min_z), (s_max_x, s_min_y, s_max_z),
                                (s_max_x, s_max_y, s_min_z), (s_max_x, s_max_y, s_max_z)
                            ]
                            
                            for cx, cy, cz in corners:
                                # Apply 1 (Sub-part position/rotation)
                                nx = a*cx + b*cy + c*cz + sub_x
                                ny = d*cx + e*cy + f*cz + sub_y
                                nz = g*cx + h*cy + i*cz + sub_z
                                
                                # Current accumulated matrix is handled by caller if we return relative coords.
                                # Wait, to keep it simple: 
                                # We want the bounding box of '3001.dat' in its own local coordinate system.
                                # So we transform sub-parts into 3001's system.
                                
                                min_x, max_x = min(min_x, nx), max(max_x, nx)
                                min_y, max_y = min(min_y, ny), max(max_y, ny)
                                min_z, max_z = min(min_z, nz), max(max_z, nz)
                                found_geometry = True

                    except Exception as e:
                        pass
                        
                # Type 3 (Triangle) & 4 (Quad) & 2 (Line - maybe ignore for physics?)
                elif line_type in ('3', '4'):
                    # 3 <colour> x1 y1 z1 x2 y2 z2 x3 y3 z3
                    try:
                        coords = [float(x) for x in parts[2:]]
                        # Extract triplets
                        for k in range(0, len(coords), 3):
                            vx, vy, vz = coords[k], coords[k+1], coords[k+2]
                            min_x, max_x = min(min_x, vx), max(max_x, vx)
                            min_y, max_y = min(min_y, vy), max(max_y, vy)
                            min_z, max_z = min(min_z, vz), max(max_z, vz)
                            found_geometry = True
                    except:
                        pass
                        
    except FileNotFoundError:
        return None

    if not found_geometry:
        return None

    return (min_x, min_y, min_z, max_x, max_y, max_z)

# Cache for raw bounding boxes (local coords)
RAW_BBOX_CACHE = {}

def get_raw_bbox(part_id, current_depth, max_depth):
    part_id = part_id.lower().strip()
    if part_id in RAW_BBOX_CACHE:
        return RAW_BBOX_CACHE[part_id]
        
    bbox = parse_ldraw_part(part_id, current_depth, max_depth)
    if bbox:
        RAW_BBOX_CACHE[part_id] = bbox
    return bbox

def get_part_dims(part_id: str):
    """
    Returns (width, depth, height) in studs/bricks.
    """
    clean_id = part_id.lower().replace(".dat", "").strip()
    filename = f"{clean_id}.dat"
    
    # Check cache first (Result cache)
    if clean_id in DIMENSION_CACHE:
        return DIMENSION_CACHE[clean_id]
        
    # Calculate
    bbox = get_raw_bbox(filename, 0, 10) # Max depth 10 to ensure we catch deep subfiles (studs, pins)
    
    if not bbox:
        # Fallback to 1x1x1 if file not found

        
        # print(f"Part file not found: {filename}, using default BRICK dimensions.")
        return None
        
    min_x, min_y, min_z, max_x, max_y, max_z = bbox
    
    # Return the raw local bounding box (LDU)
    # (min_x, min_y, min_z, max_x, max_y, max_z)
    # The Loader will handle rotation and unit conversion.
    DIMENSION_CACHE[clean_id] = bbox
    return bbox
