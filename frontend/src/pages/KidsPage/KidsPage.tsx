import "./KidsPage.css";
import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";

// import kidBg from "../../assets/kid_bg.png";
// import dino from "../../assets/di.png";
import Background3D from "../MainPage/components/Background3D";

import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsGlbViewer from "./components/KidsGlbViewer";

export default function KidsPage() {
  const [params] = useSearchParams();
  const location = useLocation();

  const modelUrl = params.get("model");

  // navigate state에서 파일 받기
  const uploadedFile = (location.state as { uploadedFile?: File } | null)?.uploadedFile;

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
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
        setGlbUrl(null);

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

        // Handle result (data.imageUrl might be data URI or relative path)
        let finalImgUrl = null;
        if (data.imageUrl) {
          if (data.imageUrl.startsWith("data:")) {
            finalImgUrl = data.imageUrl;
          } else {
            const backendOrigin = "http://localhost:8080";
            const absolute = new URL(data.imageUrl, backendOrigin).toString();
            finalImgUrl = absolute + (absolute.includes("?") ? "&" : "?") + "t=" + Date.now();
          }
        }
        setResultUrl(finalImgUrl);

        // Handle GLB
        if (data.glbUrl) {
          setGlbUrl(data.glbUrl);
        }

        if (!finalImgUrl && !data.glbUrl) {
          throw new Error("결과 응답이 비어있습니다");
        }

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
    <div className="kidsPage">
      <Background3D entryDirection="float" />
      {/* <img className="kidsPage__dino" src={dino} alt="dino" /> */}

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

              {/* 생성 완료 후: GLB가 있으면 GLB 우선 표시, 없으면 이미지 표시 */}
              {!isGenerating && glbUrl && (
                <div className="kidsPage__3dViewer" style={{ border: "2px solid #3b82f6" }}>
                  <KidsGlbViewer url={glbUrl} />
                </div>
              )}

              {!isGenerating && !glbUrl && resultUrl && (
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
