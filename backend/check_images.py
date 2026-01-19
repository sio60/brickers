import os
import glob
from pathlib import Path
import struct

def check_png(path):
    try:
        with open(path, 'rb') as f:
            header = f.read(20) # Read 20 bytes
            print(f"File: {path.name}")
            print(f"  Header (Hex): {header.hex()}")
            try:
                print(f"  Header (Str): {header.decode('utf-8', errors='ignore')}")
            except:
                pass
            
            if header.startswith(b'\x89PNG\r\n\x1a\n'):
                return "OK"
            return "INVALID_HEADER"
    except Exception as e:
        return f"ERROR: {e}"

def main():
    out_dir = Path("uploads/kids/out")
    if not out_dir.exists():
        print(f"Directory {out_dir} does not exist.")
        return

    files = list(out_dir.glob("*.png"))
    # Sort by mtime
    files.sort(key=lambda x: x.stat().st_mtime)
    
    print(f"Checking last 3 files...")
    for p in files[-3:]:
        status = check_png(p)
        print(f"  Status: {status}")

if __name__ == "__main__":
    main()
