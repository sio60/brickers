import "./KidsPage.css";
import { useRef, useState } from "react";

import kidBg from "../../assets/kid_bg.png";
import dino from "../../assets/di.png";

export default function KidsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const setSelectedFile = (f: File) => {
    // 이미지 파일만
    if (!f.type.startsWith("image/")) return;

    setFile(f);

    // 이전 미리보기 해제
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
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
    if (inputRef.current) inputRef.current.value = "";
  };

  const onGenerate = () => {
    if (!file) return;
    // TODO: 여기서 업로드/3D 변환 요청 붙이면 됨
    console.log("upload file:", file);
  };

  return (
    <div
      className="kidsPage"
      style={{
        backgroundImage: `url(${kidBg})`,
      }}
    >
      {/* 왼쪽 빼곰 공룡 */}
      <img className="kidsPage__dino" src={dino} alt="dino" />

      {/* 중앙 */}
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
              <img
                className="kidsUpload__preview"
                src={previewUrl}
                alt="preview"
              />
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

        {/* ✅ 업로드 박스 바로 아래 버튼 */}
        <button
          className="kidsPage__cta"
          type="button"
          disabled={!file}
          onClick={onGenerate}
        >
          생성하기
        </button>
      </div>
    </div>
  );
}
