import sys
import os

# Ensure modules can be loaded
# Ensure modules can be loaded (Robust against running from different dirs)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ldr_loader import LdrLoader
from verifier import PhysicalVerifier
from models import VerificationResult, Evidence

def debug_ldr(target_file="shark.ldr"):
    # Build absolute path if needed, or stick to relative if running from root
    # default to current dir -> shark.ldr
    file_path = os.path.abspath(target_file)
    
    print(f"Loading {file_path}...")
    loader = LdrLoader()
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    plan = loader.load_from_file(file_path)
    print(f"Loaded {len(plan.bricks)} bricks.")

    verifier = PhysicalVerifier(plan)

    print("\n--- [DEBUG] Loaded Bricks Coordinates ---")
    all_bricks = plan.get_all_bricks()
    # Sort by Z (Height) to see layers
    all_bricks.sort(key=lambda b: b.z)
    
    # Show first 50 bricks to check dimensions (especially height)
    for b in all_bricks[:50]: 
         print(f"ID: {b.id}, Pos: ({b.x:.2f}, {b.y:.2f}, {b.z:.2f}), Size: {b.width:.2f}x{b.depth:.2f}x{b.height:.2f}")
    print("... (showing first 50 only) ...")
    print("-----------------------------------------\n")
    
    print(f"Graph Nodes: {verifier.graph.number_of_nodes()}")
    print(f"Graph Edges: {verifier.graph.number_of_edges()}")
    
    # Print edges
    # print("Edges found:")
    # for u, v in verifier.graph.edges():
    #     print(f"  {u} -- {v}")

    # 2. Check Floating
    result = VerificationResult()
    verifier.verify_floating(result)
    
    if not result.is_valid:
        print("\n[FAIL] Floating Check Failed! (Issues Detected)")
        for ev in result.evidence:
            print(f"  [{ev.type}] {ev.message}")
            # print(f"  Floating Bricks: {ev.brick_ids}")
            
            # Print details of floating bricks
            # for bid in ev.brick_ids:
            #     b = plan.bricks[bid]
            #     print(f"    Brick {bid}: z={b.z:.2f}, h={b.height}, (x={b.x:.2f}, y={b.y:.2f})")
    else:
        print("\n[PASS] Floating Check Passed. (Structure is contiguous)")

    # 3. Collision Check (New)
    print("\n[3] Running Collision Check...")
    verifier.verify_collision(result)
    if not result.is_valid:
        # Check if any collision errors exist
        collisions = [e for e in result.evidence if e.type == "COLLISION"]
        if collisions:
            print(f"\n[FAIL] Found {len(collisions)} Collisions!")
            for ev in collisions:
                 print(f"  {ev.message}")
    else:
        print("[PASS] No Collisions detected.")
        
    # 4. Stability (Optional)
    # verifier.verify_stability(result)

if __name__ == "__main__":
    # You can change this to "green_supercar.ldr" or any other file
    target = "shark.ldr"
    if len(sys.argv) > 1:
        target = sys.argv[1]
        
    debug_ldr(target)
