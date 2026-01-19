from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
# ✅ service logic import
from ai.service.nano_banana import render_one_image

router = APIRouter(prefix="/v1/kids", tags=["kids"])

@router.post("/render-image")
async def render_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="image only")

    try:
        img_bytes = await file.read()
        out_bytes = await render_one_image(img_bytes, file.content_type or "image/png")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # General error fallback
        print(f"Error in kids_render: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during generation")

    return Response(content=out_bytes, media_type="image/png")
