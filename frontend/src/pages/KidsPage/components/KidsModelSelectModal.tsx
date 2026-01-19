import "./KidsModelSelectModal.css";
import { useEffect, useRef, useState } from "react";
import UpgradeModal from "../../MainPage/components/UpgradeModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string | null, file: File | null) => void;
  items: { title: string; url: string; thumbnail?: string }[];
};

export default function KidsModelSelectModal({ open, onClose, onSelect, items }: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 업그레이드 관련 상태
  const [isPro, setIsPro] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Pro 상태 체크 (마운트 시 + 스토리지 변경 시)
  useEffect(() => {
    const checkPro = () => {
      setIsPro(localStorage.getItem("isPro") === "true");
    };
    checkPro();

    window.addEventListener("storage", checkPro);
    return () => window.removeEventListener("storage", checkPro);
  }, []);

  if (!open) return null;

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    // Pro가 아니면 드롭 시에도 업그레이드 모달
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }

    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleUploadClick = () => {
    if (isPro) {
      // Pro면 파일 선택 창 오픈
      inputRef.current?.click();
    } else {
      // 아니면 업그레이드 모달 오픈
      setShowUpgrade(true);
    }
  };

  const handleConfirm = () => {
    if (file || selectedUrl) {
      onSelect(selectedUrl, file);
    }
  };

  // 모델 선택 OR 이미지 업로드 둘 중 하나만 있으면 OK
  const canSubmit = !!file || !!selectedUrl;

  return (
    <>
      <div className="kidsModelModal__overlay" onClick={onClose}>
        <div className="kidsModelModal" onClick={(e) => e.stopPropagation()}>
          <div className="kidsModelModal__head">
            <div className="kidsModelModal__title">레고 만들기</div>
            <div className="kidsModelModal__sub">모델 선택 또는 이미지 업로드</div>
            <button className="kidsModelModal__close" onClick={onClose} aria-label="close">
              ✕
            </button>
          </div>

          <div className="kidsModelModal__grid">
            {items.map((it) => (
              <div
                key={it.url}
                className={`kidsModelCard ${selectedUrl === it.url ? "isSelected" : ""}`}
                onClick={() => setSelectedUrl(it.url)}
              >
                <div className="kidsModelCard__viewer">
                  {it.thumbnail ? (
                    <img
                      src={it.thumbnail}
                      alt={it.title}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                      No Preview
                    </div>
                  )}
                </div>

                <div className="kidsModelCard__footer">
                  <div className="kidsModelCard__label">{it.title}</div>
                  <div className="kidsModelCard__pick">
                    {selectedUrl === it.url ? "선택됨" : "선택"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 이미지 업로드 영역 */}
          <div
            className={`kidsModelModal__upload ${dragOver ? "isDragOver" : ""} ${file ? "hasFile" : ""}`}
            onClick={handleUploadClick}
            onDragEnter={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              // Pro가 아니면 input 비활성화 (보안상 추가)
              disabled={!isPro}
            />
            {previewUrl ? (
              <div className="kidsModelModal__uploadPreviewWrap">
                <img src={previewUrl} alt="preview" className="kidsModelModal__uploadPreview" />
                <div className="kidsModelModal__uploadFilename">{file?.name}</div>
              </div>
            ) : isPro ? (
              // Pro 유저 UI
              <>
                <div className="kidsModelModal__uploadTitle">이미지 업로드</div>
                <div className="kidsModelModal__uploadSub">클릭하거나 파일을 여기로 드래그하세요</div>
                <div className="kidsModelModal__uploadHint">JPG / PNG / WEBP</div>
              </>
            ) : (
              // 무료 유저 UI
              <>
                <div className="kidsModelModal__uploadTitle">이미지 업로드 (유료 기능)</div>
                <div className="kidsModelModal__uploadSub">클릭하여 업그레이드하세요</div>
                <div className="kidsModelModal__uploadHint">업그레이드 시 사용 가능</div>
              </>
            )}
          </div>

          <div className="kidsModelModal__actions">
            <button
              className="kidsModelModal__confirmBtn"
              disabled={!canSubmit}
              onClick={handleConfirm}
            >
              생성하기
            </button>
          </div>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
