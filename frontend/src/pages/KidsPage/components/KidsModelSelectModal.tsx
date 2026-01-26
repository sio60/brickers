import "./KidsModelSelectModal.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UpgradeModal from "../../MainPage/components/UpgradeModal";
import LoginModal from "../../MainPage/components/LoginModal";
import KidsLdrPreview from "./KidsLdrPreview";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAuth } from "../../Auth/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string | null, file: File | null) => void;
  items: { title: string; url: string; thumbnail?: string }[];
};

export default function KidsModelSelectModal({ open, onClose, onSelect, items }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 2단계 플로우: 'select' = 모델 선택, 'preview' = 3D 미리보기
  const [step, setStep] = useState<'select' | 'preview'>('select');

  // 업그레이드 및 로그인 관련 상태
  const [isPro, setIsPro] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Pro 상태 체크 (마운트 시 + 스토리지 변경 시)
  useEffect(() => {
    const checkPro = () => {
      setIsPro(localStorage.getItem("isPro") === "true");
    };
    checkPro();

    window.addEventListener("storage", checkPro);
    return () => window.removeEventListener("storage", checkPro);
  }, []);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedUrl(null);
    }
  }, [open]);

  if (!open) return null;

  // 모델 카드 클릭 시 3D 미리보기로 전환
  const handleModelClick = (url: string) => {
    // ✅ 로그인 체크
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setShowLogin(true);
      return;
    }
    setSelectedUrl(url);
    setStep('preview');
  };

  // NEXT → 버튼: 스텝 페이지로 이동
  const handleGoToSteps = () => {
    if (selectedUrl) {
      onClose();
      navigate(`/kids/steps?url=${encodeURIComponent(selectedUrl)}`);
    }
  };


  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    // ✅ 로그인 체크
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setShowLogin(true);
      return;
    }

    // Pro가 아니면 드롭 시에도 업그레이드 모달
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }

    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleUploadClick = () => {
    // ✅ 로그인 체크
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setShowLogin(true);
      return;
    }

    if (isPro) {
      // Pro면 파일 선택 창 오픈
      inputRef.current?.click();
    } else {
      // 아니면 업그레이드 모달 오픈
      setShowUpgrade(true);
    }
  };

  const handleConfirm = () => {
    // ✅ 마지막 컨펌 단계에서도 한번 더 체크
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setShowLogin(true);
      return;
    }

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
          {step === 'select' ? (
            /* ====================== 모델 선택 화면 ====================== */
            <>
              <div className="kidsModelModal__head">
                <div className="kidsModelModal__title">{t.kids.modelSelect.title}</div>
                <div className="kidsModelModal__sub">{t.kids.modelSelect.sub}</div>
                <button className="kidsModelModal__close" onClick={onClose} aria-label="close">
                  ✕
                </button>
              </div>

              <div className="kidsModelModal__grid">
                {items.map((it) => (
                  <div
                    key={it.url}
                    className={`kidsModelCard ${selectedUrl === it.url ? "isSelected" : ""}`}
                    onClick={() => handleModelClick(it.url)}
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
                          {t.common.noPreview}
                        </div>
                      )}
                    </div>

                    <div className="kidsModelCard__footer">
                      <div className="kidsModelCard__label">{it.title}</div>
                      <div className="kidsModelCard__pick">{t.kids.modelSelect.pick}</div>
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
                    <div className="kidsModelModal__uploadTitle">{t.kids.modelSelect.uploadTitle}</div>
                    <div className="kidsModelModal__uploadSub">{t.kids.modelSelect.uploadSub}</div>
                    <div className="kidsModelModal__uploadHint">{t.kids.modelSelect.uploadHint}</div>
                  </>
                ) : (
                  // 무료 유저 UI
                  <>
                    <div className="kidsModelModal__uploadTitle">{t.kids.modelSelect.uploadProTitle}</div>
                    <div className="kidsModelModal__uploadSub">{t.kids.modelSelect.uploadProSub}</div>
                    <div className="kidsModelModal__uploadHint">{t.kids.modelSelect.uploadProHint}</div>
                  </>
                )}
              </div>

              <div className="kidsModelModal__actions">
                <button
                  className="kidsModelModal__confirmBtn"
                  disabled={!canSubmit}
                  onClick={handleConfirm}
                >
                  {t.kids.modelSelect.confirm}
                </button>
              </div>
            </>
          ) : (
            /* ====================== 3D 미리보기 화면 ====================== */
            <>
              <div className="kidsModelModal__head">
                <div className="kidsModelModal__title">{t.kids.modelSelect.previewTitle}</div>
                <div className="kidsModelModal__sub">{t.kids.modelSelect.previewSub}</div>
                <button className="kidsModelModal__close" onClick={onClose} aria-label="close">
                  ✕
                </button>
              </div>

              {/* 3D 뷰어 */}
              <div
                style={{
                  width: "100%",
                  height: 400,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#f8f9fa",
                  position: "relative",
                }}
              >
                {selectedUrl && <KidsLdrPreview url={selectedUrl} />}
              </div>

              <div className="kidsModelModal__actions" style={{ marginTop: 16 }}>
                <button
                  className="kidsModelModal__confirmBtn"
                  onClick={handleGoToSteps}
                  style={{
                    background: "#000",
                    color: "#fff",
                    padding: "14px 32px",
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  {t.kids.generate.next}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
