from ldr_loader import LdrLoader
from verifier import PhysicalVerifier
from models import Brick
import sys
import os

def test_ldr_loading():
    print("--- [LDR Loader Test] ---\n")
    loader = LdrLoader()
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    elif os.path.exists("physical_verification/sample.ldr"):
        file_path = "physical_verification/sample.ldr"
    else:
        file_path = "sample.ldr"
        
    print(f"Loading file: {file_path}")
    
    try:
        plan = loader.load_from_file(file_path)
        print(f"Loaded {len(plan.bricks)} bricks from {file_path}")
        
        bricks = plan.get_all_bricks()
        min_z = min(b.z for b in bricks)
        max_z = max(b.z for b in bricks)
        print(f"Stats: Min Z = {min_z:.4f}, Max Z = {max_z:.4f}")
        
        # for b in bricks:
        #    print(f" - Brick {b.id}: Pos({b.x:.2f}, {b.y:.2f}, {b.z:.2f}) Size({b.width}x{b.depth}x{b.height})")
            
        print("\nRunning Physical Verification on LDR data...")
        verifier = PhysicalVerifier(plan)
        result = verifier.run_all_checks()
        
        print(f"Validation Result: {result.is_valid}, Score={result.score}")
        for ev in result.evidence:
             print(f"Ev: {ev.message}")
             
        if result.is_valid:
            print("\n[PASS] LDR Loading & Verification Success.")
        else:
            print("\n[FAIL] Verification Failed (Check coordinates).")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ldr_loading()
