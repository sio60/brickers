import sys
import os

# Ensure modules can be loaded
sys.path.append(os.getcwd())

from ldr_loader import LdrLoader
from verifier import PhysicalVerifier
from models import VerificationResult, Evidence

def debug_car():
    # Path to green_supercar.ldr (known faulty model)
    car_path = r"c:\Users\301\Desktop\brickers\green_supercar.ldr"
    
    print(f"Loading {car_path}...")
    loader = LdrLoader()
    plan = loader.load_from_file(car_path)
    print(f"Loaded {len(plan.bricks)} bricks.")

    verifier = PhysicalVerifier(plan)

    print("\n--- [DEBUG] Loaded Bricks Coordinates ---")
    all_bricks = plan.get_all_bricks()
    # Sort by Z (Height) to see layers
    all_bricks.sort(key=lambda b: b.z)
    for b in all_bricks[:50]: # Too many bricks, show first 50 (bottom layers)
         print(f"ID: {b.id}, Pos: ({b.x:.2f}, {b.y:.2f}, {b.z:.2f}), Size: {b.width:.2f}x{b.depth:.2f}x{b.height:.2f}")
    print("... (showing first 50 only) ...")
    print("-----------------------------------------\n")
    print(f"Graph Nodes: {verifier.graph.number_of_nodes()}")
    print(f"Graph Edges: {verifier.graph.number_of_edges()}")
    
    # Print edges
    print("Edges found:")
    for u, v in verifier.graph.edges():
        print(f"  {u} -- {v}")

    # 2. Check Floating
    result = VerificationResult()
    verifier.verify_floating(result)
    
    if not result.is_valid:
        print("\n[FAIL] Floating Check Failed!")
        for ev in result.evidence:
            print(f"  {ev.message}")
            print(f"  Floating Bricks: {ev.brick_ids}")
            
            # Print details of floating bricks
            for bid in ev.brick_ids:
                b = plan.bricks[bid]
                print(f"    Brick {bid}: z={b.z:.2f}, h={b.height}, (x={b.x:.2f}, y={b.y:.2f})")
    else:
        print("\n[PASS] Floating Check Passed.")
        
    # 3. Stability
    # verifier.verify_stability(result)

if __name__ == "__main__":
    debug_car()
