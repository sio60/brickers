import os
import base64
from typing import Union

from google import genai
from google.genai import types

# config.py에서 ai/.env를 로드하므로, 여기서는 os.getenv로 읽으면 됨
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
PROMPT = """
Create ONE SINGLE IMAGE that is a 2x2 grid collage (four panels inside one image).
Do NOT output separate images. Do NOT output a single-view image.

Layout (must be visible as 4 distinct panels with clear spacing/borders):
- Top-left: front view
- Top-right: left 3/4 view
- Bottom-left: right 3/4 view
- Bottom-right: back view

Rules:
- The result must be ONE composite image containing all four panels.
- Clean white studio background in every panel.
- Soft shadow in every panel.
- Keep the exact same LEGO model/subject consistent across panels.
- Same lighting and scale across panels.
- Add thin dividers or margins between panels so the 2x2 grid is obvious.
"""



def _decode_if_base64_image(data: Union[bytes, str]) -> bytes:
    """
    Gemini 응답이 어떤 환경에서는
    - 진짜 이미지 바이너리(PNG/JPEG bytes)
    - base64 문자열(bytes or str)
    - data:image/png;base64,... 형태
    로 올 수 있어서, base64면 디코드해서 "진짜 이미지 bytes"로 바꿔줌.
    """
    if data is None:
        return b""

    # str -> bytes
    if isinstance(data, str):
        s = data.strip()
    else:
        # bytes -> str 시도(실패하면 바이너리로 간주)
        try:
            s = data.decode("utf-8", errors="strict").strip()
        except Exception:
            return data  # 이미 바이너리일 가능성 높음

    # data URL 형태면 prefix 제거
    if s.startswith("data:image"):
        # data:image/png;base64,XXXX
        try:
            s = s.split(",", 1)[1].strip()
        except Exception:
            pass

    # base64 PNG는 보통 iVBOR... 로 시작
    # JPEG base64는 보통 /9j/ 로 시작
    looks_like_base64 = (
        s.startswith("iVBOR") or
        s.startswith("/9j/") or
        all(c.isalnum() or c in "+/=\n\r" for c in s[:200])
    )

    if looks_like_base64:
        try:
            return base64.b64decode(s, validate=False)
        except Exception:
            # 디코딩 실패하면 원본을 바이너리로 취급
            return data if isinstance(data, (bytes, bytearray)) else s.encode("utf-8")

    # base64 아니면 원문이 바이너리였거나 텍스트였던 것
    return data if isinstance(data, (bytes, bytearray)) else s.encode("utf-8")


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
    if not resp.candidates:
        raise ValueError("no candidates from model")

    parts = resp.candidates[0].content.parts if resp.candidates[0].content else []
    out_bytes = None

    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            out_bytes = inline.data
            break

    if out_bytes is None:
        raise ValueError("no image returned from model")

    # ✅ 여기서 base64면 "진짜 이미지 바이너리"로 디코드
    out_bytes = _decode_if_base64_image(out_bytes)

    # 안전장치: PNG/JPEG 매직넘버 체크(디코드가 안 됐으면 바로 감지됨)
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    # JPG: FF D8
    if len(out_bytes) >= 2 and out_bytes[0] == 0xFF and out_bytes[1] == 0xD8:
        return out_bytes
    if len(out_bytes) >= 8 and out_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return out_bytes

    # 여전히 iVBOR로 시작하면 base64가 남아있는 거라 추가 디코드 시도
    try:
        head = out_bytes[:20].decode("utf-8", errors="ignore")
        if head.startswith("iVBOR") or head.startswith("/9j/"):
            out_bytes = base64.b64decode(out_bytes, validate=False)
    except Exception:
        pass

    return out_bytes
