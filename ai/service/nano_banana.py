import os
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

PROMPT = """
Turn the uploaded image into a single LEGO-like 3D render image.
Clean white studio background, soft shadow, isometric-ish angle.
Return only ONE image.
"""

async def render_one_image(img_bytes: bytes, mime: str) -> bytes:
    resp = client.models.generate_content(
        model=os.getenv("NANO_BANANA_MODEL", "gemini-2.5-flash-image"),
        contents=[{
            "role": "user",
            "parts": [
                {"text": PROMPT},
                {"inline_data": {"mime_type": mime, "data": img_bytes}},
            ],
        }],
    )

    # TODO: 너희 현재 SDK 응답 구조에 맞게 bytes 추출
    # (여기만 너희 main.py/app.py 코드 보면서 정확히 맞춰줄 수 있음)
    raise NotImplementedError("extract image bytes from response")
