from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
import shutil
from typing import List, Dict, Any

# Import verification logic
# Assuming server.py is in the same directory as these modules
try:
    from ldr_loader import LdrLoader
    from models import VerificationResult, Evidence
    from verifier import PhysicalVerifier
except ImportError:
    # Fallback for when running from root or different context if needed
    from .ldr_loader import LdrLoader
    from .models import VerificationResult, Evidence
    from .verifier import PhysicalVerifier

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/verify")
async def verify_ldr(file: UploadFile = File(...)):
    temp_file_path = ""
    try:
        # Save uploaded file
        suffix = os.path.splitext(file.filename)[1]
        if not suffix:
            suffix = ".ldr"
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name

        print(f"Processing file: {temp_file_path}")

        # Load LDR
        loader = LdrLoader()
        try:
            plan = loader.load_from_file(temp_file_path)
            print(f"Loaded plan with {len(plan.bricks)} bricks.")
        except Exception as e:
            print(f"Load error: {e}")
            return {"is_valid": False, "score": 0, "evidence": [], "error": f"Failed to load LDR: {str(e)}"}

        # Verify
        result = VerificationResult()
        verifier = PhysicalVerifier(plan)
        
        print("Running floating check...")
        verifier.verify_floating(result)
        
        print("Running stability check...")
        verifier.verify_stability(result)

        # Serialize result
        response_data = {
            "is_valid": result.is_valid,
            "score": result.score,
            "evidence": [
                {
                    "type": ev.type,
                    "severity": ev.severity,
                    "brick_ids": ev.brick_ids,
                    "message": ev.message
                } for ev in result.evidence
            ]
        }
        print("Verification complete.")
        return response_data
        
    except Exception as e:
        print(f"Server error: {e}")
        return {"is_valid": False, "score": 0, "evidence": [], "error": str(e)}
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
