# Part Library: Maps LDraw Part IDs to logic dimensions
# Key: LDraw Part ID (string, lowercase, without .dat)
# Value: (Width, Depth, Height) in Studs/Brick-Height

PART_DIMENSIONS = {
    # Basic Bricks
    "3005": (1, 1, 1.0),  # 1x1 Brick
    "3004": (1, 2, 1.0),  # 1x2 Brick
    "3622": (1, 3, 1.0),  # 1x3 Brick
    "3010": (1, 4, 1.0),  # 1x4 Brick
    "3001": (2, 4, 1.0),  # 2x4 Brick
    "3003": (2, 2, 1.0),  # 2x2 Brick
    
    # Plates
    "3024": (1, 1, 1.0/3.0),  # 1x1 Plate
    "3023": (1, 2, 1.0/3.0),  # 1x2 Plate
    "3020": (2, 4, 1.0/3.0),  # 2x4 Plate
    "3022": (2, 2, 1.0/3.0),  # 2x2 Plate
}

def get_part_dims(part_id: str):
    clean_id = part_id.lower().replace(".dat", "")
    return PART_DIMENSIONS.get(clean_id)
