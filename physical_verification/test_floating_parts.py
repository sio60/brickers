import sys
import os

sys.path.append(os.getcwd())
from physical_verification.part_library import get_part_dims

def log(msg):
    print(msg)
    with open("debug_dims.txt", "a") as f:
        f.write(msg + "\n")

if os.path.exists("debug_dims.txt"):
    os.remove("debug_dims.txt")

problem_parts = ["4214.dat", "3823.dat", "4213.dat", "3020.dat"]

for pid in problem_parts:
    try:
        dims = get_part_dims(pid)
        if dims:
            w, d, h = dims
            log(f"Part {pid}: {w:.2f} x {d:.2f} x {h:.2f} (Studs x Studs x Bricks)")
        else:
            log(f"Part {pid}: Not Found / Failed to Parse")
    except Exception as e:
        log(f"Part {pid}: Error {e}")
