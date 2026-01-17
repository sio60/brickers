from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from services.nano_banana import render_one_image

router = APIRouter(prefix="/v1/kids", tags=["kids"])

@router.post("/render-image")
async def render_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="image only")

    img_bytes = await file.read()
    out_png = await render_one_image(img_bytes, file.content_type or "image/png")

    return Response(content=out_png, media_type="image/png")
