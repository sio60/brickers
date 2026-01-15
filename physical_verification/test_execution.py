import sys
import os
print("Starting test...")
sys.path.append(os.getcwd())
try:
    from ldr_loader import LdrLoader
    print("Loader imported.")
    car_path = r"c:\Users\301\Desktop\brickers\frontend\public\ldraw\models\car.ldr"
    if os.path.exists(car_path):
        print(f"File exists: {car_path}")
    else:
        print(f"File MISSING: {car_path}")
except Exception as e:
    print(f"Error: {e}")
print("Done.")
