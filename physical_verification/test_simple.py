from models import Brick, BrickPlan
from verifier import PhysicalVerifier
import numpy as np

def run_test():
    print("--- [Physical Verification Module Test] ---\n")
    
    # CASE 1: Stable Tower (1x1 on top of 1x1)
    # 바닥(z=0)에 하나, 그 바로 위에(z=1) 하나. 아주 안정적.
    print(">> TEST 1: Stable Tower (Normal Case)")
    bricks = [
        Brick(id="b1", x=0, y=0, z=0, width=1, depth=1, height=1),
        Brick(id="b2", x=0, y=0, z=1, width=1, depth=1, height=1)
    ]
    plan = BrickPlan(bricks)
    verifier = PhysicalVerifier(plan)
    result = verifier.run_all_checks()
    print(f"   Result: Valid={result.is_valid}, Score={result.score}")
    if result.is_valid:
        print("   [PASS] As expected.")
    else:
        for ev in result.evidence: print(f"   [FAIL] {ev.message}")

    # CASE 2: Floating Brick (공중 부양)
    # 바닥(z=0)에 하나, z=2에 하나 (중간에 z=1이 없음).
    print("\n>> TEST 2: Floating Brick (Should Fail)")
    bricks_floating = [
        Brick(id="b1", x=0, y=0, z=0, width=1, depth=1, height=1),
        Brick(id="b2", x=0, y=0, z=2, width=1, depth=1, height=1) 
    ]
    plan_f = BrickPlan(bricks_floating)
    verifier_f = PhysicalVerifier(plan_f)
    result_f = verifier_f.run_all_checks()
    
    if not result_f.is_valid:
        print(f"   [PASS] Correctly detected failure.")
        for ev in result_f.evidence: print(f"   Evidence: {ev.message}")
    else:
        print("   [FAIL] Failed to detect floating brick!")

    # CASE 3: Unstable (Toppling / 전도)
    # 바닥은 좁은데(1x1), 위에 엄청 무거운게 옆으로 튀어나와 있음.
    print("\n>> TEST 3: Unstable/Toppling Structure (Should Fail or Warn)")
    
    # Leaning Tower Case (계단식)
    bricks_leaning = []
    for i in range(5):
        bricks_leaning.append(
            Brick(id=f"b{i}", x=i*0.5, y=0, z=i*1.0, width=1, depth=1, height=1, mass=1)
        )
    
    plan_u = BrickPlan(bricks_leaning)
    verifier_u = PhysicalVerifier(plan_u)
    result_u = verifier_u.run_all_checks()
    
    if not result_u.is_valid:
         print(f"   [PASS] Correctly detected instability.")
         for ev in result_u.evidence: print(f"   Evidence: {ev.message}")
    else:
         if result_u.score < 100:
             print(f"   [PASS-WARNING] Valid but penalized. Score={result_u.score}")
             for ev in result_u.evidence: print(f"   Evidence: {ev.message}")
         else: 
             print(f"   [FAIL] Failed to detect instability. Score={result_u.score}")

    # CASE 4: Weak Connection (1-Stud)
    # 2x2 brick on top of 2x2 brick, but only overlapping by 1x1 area
    # b1: (0,0) 2x2
    # b2: (1,1) 2x2. Overlap is (1,1) to (2,2) -> Area 1x1 = 1 stud
    print("\n>> TEST 4: Weak Connection (1-Stud)")
    bricks_weak = [
        Brick(id="b1", x=0, y=0, z=0, width=2, depth=2, height=1),
        Brick(id="b2", x=1, y=1, z=1, width=2, depth=2, height=1)
    ]
    plan_w = BrickPlan(bricks_weak)
    verifier_w = PhysicalVerifier(plan_w)
    
    # Adult Mode: Should be Warning (Score penalty), but Valid=True
    result_w_adult = verifier_w.run_all_checks(mode="ADULT")
    print(f"   [ADULT] Valid={result_w_adult.is_valid}, Score={result_w_adult.score} (Expected: True, Score < 100)")
    for ev in result_w_adult.evidence: print(f"    - {ev.severity}: {ev.message}")

    # Kids Mode: Should be Hard Fail
    result_w_kids = verifier_w.run_all_checks(mode="KIDS")
    print(f"   [KIDS]  Valid={result_w_kids.is_valid} (Expected: False)")
    for ev in result_w_kids.evidence: print(f"    - {ev.severity}: {ev.message}")
    
    # CASE 5: Dangerous Overhang
    # Little base, big top.
    # Base: 2x2 (Area 4). Top: 4x4 (Area 16).
    # If overlap is 4 (full base), support ratio = 4/16 = 25%.
    # Adult (30%) -> Fail/Warn. Kids (50%) -> Fail.
    print("\n>> TEST 5: Dangerous Overhang")
    bricks_overhang = [
        Brick(id="base", x=1, y=1, z=0, width=2, depth=2, height=1), # Center at 2,2
        Brick(id="top",  x=0, y=0, z=1, width=4, depth=4, height=1)  # Covers base fully
    ]
    # Check overlap explicitly:
    # Top covers (0,0)-(4,4). Base is (1,1)-(3,3). 
    # Overlap is full base (2x2=4). 
    # Top Area = 16. Ratio = 4/16 = 0.25 (25%).
    
    plan_o = BrickPlan(bricks_overhang)
    verifier_o = PhysicalVerifier(plan_o)
    
    result_o = verifier_o.run_all_checks(mode="ADULT") # Threshold 0.3
    print(f"   [Overhang] Support Ratio ~25%. Valid={result_o.is_valid}, Score={result_o.score}")
    has_overhang_msg = any("Overhang" in ev.message for ev in result_o.evidence)
    if has_overhang_msg:
        print("   [PASS] Overhang detected.")
        for ev in result_o.evidence: print(f"    - {ev.message}")
if __name__ == "__main__":
    run_test()
