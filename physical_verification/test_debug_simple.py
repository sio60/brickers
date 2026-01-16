import sys
import os
import time

sys.path.append(os.getcwd())
from physical_verification.part_library import get_part_dims

def log(msg):
    print(msg)
    with open("debug_log.txt", "a") as f:
        f.write(msg + "\n")

if os.path.exists("debug_log.txt"):
    os.remove("debug_log.txt")

parts_to_test = ["3001.dat", "3005.dat", "3641.dat", "4624.dat"]

for pid in parts_to_test:
    start = time.time()
    log(f"Testing {pid}...")
    try:
        dims = get_part_dims(pid)
        elapsed = time.time() - start
        log(f"  -> {dims} (took {elapsed:.4f}s)")
    except Exception as e:
        log(f"  -> ERROR: {e}")
