import sys
import time

print("Hello stdout", flush=True)
sys.stdout.write("Hello sys.stdout\n")
sys.stdout.flush()
time.sleep(1)
print("Done", flush=True)
