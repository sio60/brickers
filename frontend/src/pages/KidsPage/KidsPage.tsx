import "./KidsPage.css";
import { useRef, useState } from "react";

import kidBg from "../../assets/kid_bg.png";
import dino from "../../assets/di.png";

export default function KidsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const setSelectedFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;

    setFile(f);
    setErrorMsg(null);
    setResultUrl(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const f = e.dataTransfer.files?.[0];
    if (f) setSelectedFile(f);
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onGenerate = async () => {
    if (!file) return;

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setResultUrl(null);

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/kids/render", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`요청 실패 (${res.status}) ${t}`);
      }

      const data = await res.json();
      if (!data?.imageUrl) throw new Error("imageUrl 응답이 없음");

      // ✅ 배포/로컬 안전: 절대경로 + 캐시버스트
      const absolute = new URL(data.imageUrl, window.location.origin).toString();
      const busted =
        absolute + (absolute.includes("?") ? "&" : "?") + "t=" + Date.now();

      setResultUrl(busted);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "생성 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="kidsPage" style={{ backgroundImage: `url(${kidBg})` }}>
      <img className="kidsPage__dino" src={dino} alt="dino" />

      <div className="kidsPage__center">
        <div
          className={`kidsUpload ${dragOver ? "kidsUpload--drag" : ""}`}
          onClick={openPicker}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onChangeFile}
            className="kidsUpload__input"
          />

          {!previewUrl ? (
            <>
              <div className="kidsUpload__title">이미지 업로드</div>
              <div className="kidsUpload__sub">
                클릭하거나 파일을 여기로 드래그하세요
              </div>
              <div className="kidsUpload__hint">JPG / PNG / WEBP</div>
            </>
          ) : (
            <div
              className="kidsUpload__previewWrap"
              onClick={(e) => e.stopPropagation()}
            >
              <img className="kidsUpload__preview" src={previewUrl} alt="preview" />
              <div className="kidsUpload__meta">
                <div className="kidsUpload__filename">{file?.name}</div>
                <button
                  className="kidsUpload__remove"
                  type="button"
                  onClick={removeFile}
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="kidsPage__cta"
          type="button"
          disabled={!file || isGenerating}
          onClick={onGenerate}
        >
          {isGenerating ? "생성 중..." : "생성하기"}
        </button>

        {errorMsg && <div className="kidsPage__error">{errorMsg}</div>}

        {resultUrl && (
          <div className="kidsResult">
            <img
              className="kidsResult__img"
              src={resultUrl}
              alt="result"
              onError={() => setErrorMsg("결과 이미지 로드 실패(서빙/경로 확인)")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
