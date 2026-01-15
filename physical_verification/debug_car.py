import sys
import os

# Ensure modules can be loaded
sys.path.append(os.getcwd())

from ldr_loader import LdrLoader
from verifier import PhysicalVerifier
from models import VerificationResult, Evidence

def debug_car():
    # Path to car.ldr
    car_path = r"c:\Users\301\Desktop\brickers\frontend\public\ldraw\models\car.ldr"
    
    print(f"Loading {car_path}...")
    loader = LdrLoader()
    plan = loader.load_from_file(car_path)
    print(f"Loaded {len(plan.bricks)} bricks.")

    verifier = PhysicalVerifier(plan)
    
    # 1. Check Connectivity Graph
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
