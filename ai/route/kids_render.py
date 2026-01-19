from fastapi import APIRouter, UploadFile, File, HTTPException
import base64
from fastapi.responses import Response
from services.nano_banana import render_one_image

router = APIRouter(prefix="/v1/kids", tags=["kids"])

@router.post("/render-image")
async def render_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="image only")

    img_bytes = await file.read()
    out = await render_one_image(img_bytes, file.content_type or "image/png")

    # If output is base64 string (starts with iVB...), decode it
    if isinstance(out, str):
        # Remove potential header like "data:image/png;base64," if present (though gemini usually returns raw b64)
        if "base64," in out:
            out = out.split("base64,")[1]
        out_bytes = base64.b64decode(out)
    else:
        out_bytes = out

    return Response(content=out_bytes, media_type="image/png")
