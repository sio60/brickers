import os
from google import genai
from google.genai import types

# config.py에서 ai/.env를 로드하므로, 여기서는 os.getenv로 읽으면 됨
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

PROMPT = """
Turn the uploaded image into a single LEGO-like 3D render image.
- clean white studio background
- soft shadow
- keep the main subject consistent
- output ONLY ONE image
"""

async def render_one_image(img_bytes: bytes, mime: str) -> bytes:
    model = os.getenv("NANO_BANANA_MODEL", "gemini-2.5-flash-image")

    resp = client.models.generate_content(
        model=model,
        contents=[
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime, "data": img_bytes}},
        ],
        config=types.GenerateContentConfig(response_modalities=["Text", "Image"]),
    )

    # ✅ 응답에서 이미지 bytes 찾기
    out_bytes = None
    # out_mime = "image/png" # Not strictly used in return value of this func, usually

    if not resp.candidates:
        raise ValueError("no candidates from model")

    parts = resp.candidates[0].content.parts if resp.candidates[0].content else []
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            out_bytes = inline.data
            # out_mime = inline.mime_type or out_mime
            break

    if out_bytes is None:
        raise ValueError("no image returned from model")

    return out_bytes
