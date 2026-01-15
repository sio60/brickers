import sys
import os
import math

sys.path.append(os.getcwd())

from ldr_loader import LdrLoader
from verifier import PhysicalVerifier

def log(msg):
    print(msg)
    with open("debug_neighbors_log.txt", "a") as f:
        f.write(msg + "\n")

if os.path.exists("debug_neighbors_log.txt"):
    os.remove("debug_neighbors_log.txt")

def check_neighbors():
    car_path = r"c:\Users\301\Desktop\brickers\frontend\public\ldraw\models\car.ldr"
    loader = LdrLoader()
    plan = loader.load_from_file(car_path)
    
    # Target Floating IDs (derived from user screenshot)
    targets = ['3823.dat_48', '4214.dat_49', '3823.dat_50', '4213.dat_51', '3020.dat_52']
    
    floating_bricks = []
    log(f"Searching for targets: {targets}")
    
    for b in plan.bricks:
        for t in targets:
             # loose match because I don't know exact ID format used by loader
             if t in b.id:
                floating_bricks.append(b)
                log(f"Found Target: {b.id} at ({b.x:.2f}, {b.y:.2f}, {b.z:.2f}) H={b.height:.2f}")

    log("\n--- Scanning for Neighbors ---")
    for fb in floating_bricks:
        log(f"\nChecking neighbors for {fb.id} (Z={fb.z:.2f})...")
        
        # Check all other bricks
        for other in plan.bricks:
            if other.id == fb.id: continue
            
            # Check vertical proximity
            gap_below = fb.z - (other.z + other.height)
            if abs(gap_below) < 0.5: # Generous search range
                log(f"  [BELOW?] {other.id} Top={other.z + other.height:.2f} (Gap: {gap_below:.4f})")
                
                # Check Overlap
                dx = min(fb.x + fb.width, other.x + other.width) - max(fb.x, other.x)
                dy = min(fb.y + fb.depth, other.y + other.depth) - max(fb.y, other.y)
                if dx > 0 and dy > 0:
                     log(f"    -> HORIZONTAL OVERLAP! Connected? (dx={dx:.2f}, dy={dy:.2f})")
                else:
                     log(f"    -> No horizontal overlap (dx={dx:.2f}, dy={dy:.2f})")
                     
            # Intersect
            ix = min(fb.x + fb.width, other.x + other.width) - max(fb.x, other.x)
            iy = min(fb.y + fb.depth, other.y + other.depth) - max(fb.y, other.y)
            iz = min(fb.z + fb.height, other.z + other.height) - max(fb.z, other.z)
            
            if ix > 0.05 and iy > 0.05 and iz > 0.05:
                log(f"  [INTERSECT] {other.id} overlaps by ({ix:.2f}, {iy:.2f}, {iz:.2f})")


if __name__ == "__main__":
    check_neighbors()
