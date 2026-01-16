import sys
import os

sys.path.append(os.getcwd())

from physical_verification.ldr_loader import LdrLoader

def check():
    car_path = r"c:\Users\301\Desktop\brickers\frontend\public\ldraw\models\car.ldr"
    if not os.path.exists(car_path):
        print("Car file not found")
        return

    loader = LdrLoader()
    print("Loading car...")
    plan = loader.load_from_file(car_path)
    
    targets = ['3823', '4214', '3020', '3004']
    
    print("\n--- Target Bricks Positions (After Fix) ---")
    for b in plan.bricks:
        # Check if ID contains target
        for t in targets:
            if t in b.id:
                print(f"Brick {b.id}: Pos=({b.x:.2f}, {b.y:.2f}, {b.z:.2f}) Size={b.width:.2f}x{b.depth:.2f}x{b.height:.2f}")

if __name__ == "__main__":
    check()
