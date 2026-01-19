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

  // ✅ 결과/원본 보기 토글
  const [showResult, setShowResult] = useState(true);

  const openPicker = () => inputRef.current?.click();

  const setSelectedFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;

    setFile(f);
    setErrorMsg(null);
    setResultUrl(null);
    setShowResult(true);

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
    setShowResult(true);
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

      const backendOrigin = "http://localhost:8080";
      const absolute = new URL(data.imageUrl, backendOrigin).toString();
      const busted =
        absolute + (absolute.includes("?") ? "&" : "?") + "t=" + Date.now();

      setResultUrl(busted);
      setShowResult(true); // ✅ 생성 후 결과 자동 표시
    } catch (e: any) {
      setErrorMsg(e?.message ?? "생성 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ 지금 “여기(업로드 박스)”에 보여줄 이미지 결정
  const displayUrl =
    resultUrl && showResult ? resultUrl : previewUrl;

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
              {/* ✅ 결과는 아래가 아니라 “여기”에서 보여줌 */}
              {displayUrl && (
                <img
                  className="kidsUpload__preview"
                  src={displayUrl}
                  alt="preview"
                  onError={(e) => {
                    console.error("Image load fail:", e.currentTarget.src, e);
                    // 결과가 깨지면 원본으로 자동 fallback
                    if (showResult) {
                      setShowResult(false);
                      setErrorMsg("결과 이미지 로드 실패(서빙/경로 확인)");
                    }
                  }}
                />
              )}

              <div className="kidsUpload__meta">
                <div className="kidsUpload__filename">{file?.name}</div>

                {/* ✅ 결과/원본 토글 */}
                {resultUrl && (
                  <div className="kidsUpload__toggle">
                    <button
                      type="button"
                      className={`kidsUpload__toggleBtn ${!showResult ? "isActive" : ""}`}
                      onClick={() => setShowResult(false)}
                    >
                      원본
                    </button>
                    <button
                      type="button"
                      className={`kidsUpload__toggleBtn ${showResult ? "isActive" : ""}`}
                      onClick={() => setShowResult(true)}
                    >
                      결과
                    </button>
                  </div>
                )}

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

        {/* ✅ 아래 결과 영역 제거 */}
      </div>
    </div>
  );
}
