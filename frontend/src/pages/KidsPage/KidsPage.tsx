import "./KidsPage.css";
import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";

import kidBg from "../../assets/kid_bg.png";
import dino from "../../assets/di.png";

import KidsLdrPreview from "./components/KidsLdrPreview";

export default function KidsPage() {
  const [params] = useSearchParams();
  const location = useLocation();

  const modelUrl = params.get("model");

  // navigate state에서 파일 받기
  const uploadedFile = (location.state as { uploadedFile?: File } | null)?.uploadedFile;

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 이미지가 있으면 API 호출
  useEffect(() => {
    if (!uploadedFile) return;

    const generate = async () => {
      try {
        setIsGenerating(true);
        setErrorMsg(null);
        setResultUrl(null);

        const form = new FormData();
        form.append("file", uploadedFile);

        if (modelUrl) {
          form.append("referenceLdr", modelUrl);
        }

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
        const busted = absolute + (absolute.includes("?") ? "&" : "?") + "t=" + Date.now();

        setResultUrl(busted);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "생성 실패");
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [uploadedFile, modelUrl]);

  // 모드 결정: 이미지가 있으면 결과 모드, 없으면 3D 미리보기 모드
  const hasImage = !!uploadedFile;

  return (
    <div className="kidsPage" style={{ backgroundImage: `url(${kidBg})` }}>
      <img className="kidsPage__dino" src={dino} alt="dino" />

      <div className="kidsPage__center">
        <div className="kidsPage__title">레고 만들기</div>
        <div className="kidsPage__sub">
          {hasImage ? "생성 결과를 확인하세요" : "3D 미리보기"}
        </div>

        <div className="kidsPage__singleView">
          {/* 이미지가 있으면: 생성 결과 표시 */}
          {hasImage && (
            <>
              {isGenerating && (
                <div className="kidsPage__loading">
                  <div className="kidsPage__spinner" />
                  <div>이미지 생성 중...</div>
                </div>
              )}

              {!isGenerating && resultUrl && (
                <img
                  src={resultUrl}
                  alt="result"
                  className="kidsPage__resultImg"
                  onError={() => setErrorMsg("결과 이미지 로드 실패")}
                />
              )}

              {errorMsg && (
                <div className="kidsPage__error">{errorMsg}</div>
              )}
            </>
          )}

          {/* 이미지가 없고 모델만 있으면: 3D 미리보기 표시 */}
          {!hasImage && modelUrl && (
            <div className="kidsPage__3dViewer">
              <KidsLdrPreview url={modelUrl} />
            </div>
          )}

          {/* 둘 다 없으면 */}
          {!hasImage && !modelUrl && (
            <div className="kidsPage__empty">
              <div>표시할 콘텐츠가 없습니다</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
