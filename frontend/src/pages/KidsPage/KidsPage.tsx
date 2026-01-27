import React from "react";
import "./KidsPage.css";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";
import { useLanguage } from "../../contexts/LanguageContext";

// 응답 타입 (참고용)
// type GenerateResp = {
//   ok: boolean;
//   reqId: string;
//   prompt: string;
//   ldrData: string;
//   parts: number;
//   finalTarget: number;
// };

export default function KidsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const location = useLocation();
  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";

  const budget = useMemo(() => {
    if (age === "4-5") return 50;
    if (age === "6-7") return 100;
    return 150;
  }, [age]);

  const rawFile = (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [ldrUrl, setLdrUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const processingRef = useRef(false);

  useEffect(() => {
    if (!rawFile) return;
    // 이미 처리 중이거나 완료된 경우 실행 방지
    if (processingRef.current || status !== "idle") return;

    const runProcess = async () => {
      processingRef.current = true; // 동기적으로 락 설정
      setStatus("loading");
      try {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("age", age);
        formData.append("budget", String(budget));

        // 1. 생성 요청 (즉시 응답: jobId)
        const startRes = await fetch("/api/kids/generate", {
          method: "POST",
          body: formData,
        });

        if (!startRes.ok) {
          const errText = await startRes.text();
          throw new Error(`Start Error: ${errText}`);
        }

        const startData = await startRes.json();
        const jobId = startData.jobId;
        if (!jobId) throw new Error("No jobId received");

        setJobId(jobId);

        // 2. 폴링 (Polling)
        // 최대 10분, 2초 간격 = 300번 시도
        const POLL_INTERVAL = 2000;
        const MAX_ATTEMPTS = 300;

        let finalData: any = null;

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

          const statusRes = await fetch(`/api/kids/jobs/${jobId}`);
          if (!statusRes.ok) {
            console.warn(`[KidsPage] Polling failed: Status ${statusRes.status} for jobId ${jobId}`);
            if (statusRes.status === 404) {
              // 404면 작업이 없어진 것이므로 중단 고려할 수 있지만, 
              // 초기 생성 직후 DB 인덱싱 지연 가능성 대비해서 조금 더 시도하거나 로그만 찍음
              console.error(`[KidsPage] Job not found (404). ID: ${jobId}`);
            }
            continue;
          }

          const statusData = await statusRes.json();
          // statusData: { status: "RUNNING" | "DONE" | "FAILED", ... }

          if (statusData.status === "FAILED") {
            throw new Error(statusData.errorMessage || "Generation failed");
          }

          if (statusData.status === "DONE") {
            // 완료! 여기서 결과 데이터(ldrData/ldrUrl 등)가 들어있는지 확인
            // GenerateJobEntity에는 modelKey, previewImageUrl 등이 있음.
            // 하지만 LDR Data 자체는 DB에 없을 수도 있음 (Storage URL만 있을 수 있음).
            // -> 만약 ldrData가 필요하다면, DB 조회 시 modelKey(URL)를 fetch해서 가져와야 함.
            // 
            // 현재 KidsService.getJobStatus는 Entity를 그대로 반환.
            // Entity의 modelKey가 ldrUrl 역할.
            // ldrData(Base64)는 DB에 저장되지 않으므로, URL을 다운로드해야 함.
            finalData = statusData;
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000); // 5초 후 자동 숨김
            break;
          }

          // QUEUED or RUNNING -> continue
        }

        if (!finalData) throw new Error("Timeout: Generation took too long");

        // 3. 결과 처리
        // Status가 DONE이면 ldrUrl에 LDR URL이 있음 (이전: modelKey)
        const modelUrl = finalData.ldrUrl || finalData.modelKey; // 레거시 호환
        console.log("[KidsPage] Final Job Data:", finalData);

        if (!modelUrl) {
          const keys = Object.keys(finalData || {}).join(", ");
          throw new Error(`No model URL in job result. Received keys: ${keys}`);
        }

        // ✅ 더 이상 blob으로 변환하거나 로컬 URL을 생성하지 않음 (이전 페이지 이관 시 폐기됨)
        // 서버에서 전달해준 modelUrl(예: /uploads/...)을 직접 사용
        setLdrUrl(modelUrl);
        setStatus("done");

      } catch (e) {
        console.error("Brick generation failed:", e);
        setStatus("error");
      }
    };

    runProcess();

    // Cleanup 제거 (더 이상 ldrUrl이 blob이 아니므로 revoke 필요 없음)
  }, [rawFile, age, budget]);

  // 로딩바용 퍼센트 (가짜)
  const percent = status === "done" ? 100 : status === "loading" ? 60 : 0;

  return (
    <div className="kidsPage">
      <Background3D entryDirection="float" />

      <div className="kidsPage__center">
        {status === "loading" && (
          <>
            <div className="kidsPage__title">{t.kids.generate.loading}</div>
            <KidsLoadingScreen percent={percent} />
          </>
        )}

        {status === "done" && ldrUrl && (
          <>
            <div className="kidsPage__resultTitle">{t.kids.generate.ready}</div>
            <div className="kidsPage__resultCard">
              <div className="kidsPage__3dViewer">
                <KidsLdrPreview url={ldrUrl} />
              </div>
            </div>
            {/* 스텝 페이지로 이동 버튼 */}
            <button
              className="kidsPage__nextBtn"
              onClick={() => {
                const searchParams = new URL(window.location.href).searchParams;
                const age = searchParams.get("age") || "4-5";
                // jobId 및 썸네일(필요시) 전달
                // Generate-response에는 previewUrl이 없을 수 있으므로, 
                // 생성된 모델의 프리뷰 이미지가 서버에 저장되는 시점에 따라 다름.
                // 여기서는 프론트에서 알고 있는 정보를 최대한 넘김.
                navigate(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId}&age=${age}`);
              }}
            >
              {t.kids.generate.next}
            </button>
          </>
        )}

        {status === "error" && (
          <div className="kidsPage__error">
            {t.kids.generate.error.split('\n').map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* 커스텀 토스트 메시지 (우측 상단 고정) */}
        {showToast && (
          <div style={{
            position: "fixed",
            top: "80px", // 헤더 아래
            right: "20px",
            background: "#ffffff",
            border: "2px solid #000000",
            color: "#000000",
            padding: "16px 24px",
            zIndex: 9999,
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            borderRadius: "8px",
          }}>
            {t.kids.generate.complete}
          </div>
        )}
      </div>
    </div>
  );
}