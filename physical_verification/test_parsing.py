import sys
import os

# Ensure we can import from local directory
sys.path.append(os.getcwd())

from physical_verification.part_library import get_part_dims

def log(msg):
    print(msg)
    with open("test_result.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def test_part(part_id):
    log(f"Testing part: {part_id}")
    try:
        dims = get_part_dims(part_id)
        if dims:
            w, d, h = dims
            log(f"  -> Found Dimensions: {w:.2f} x {d:.2f} x {h:.2f} (Studs x Studs x Bricks)")
        else:
            log("  -> Failed to parse or find part.")
    except Exception as e:
        log(f"  -> Error: {e}")

if __name__ == "__main__":
    if os.path.exists("test_result.txt"):
        os.remove("test_result.txt")
        
    log("Starting Test...")
    # Test known parts
    test_part("3001.dat") # 2x4 Brick
    test_part("3005.dat") # 1x1 Brick
    test_part("3024.dat") # 1x1 Plate
    
    # Test a wheel part
    test_part("3641.dat") # Tyre (explicit .dat)
    
    # Test a non-existent part
    test_part("999999.dat")
    log("Test Complete.")
