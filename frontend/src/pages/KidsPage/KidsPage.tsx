import React from "react";
import "./KidsPage.css";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";
import { useLanguage } from "../../contexts/LanguageContext";

export default function KidsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const location = useLocation();
  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";

  // ✅ (선택) 백엔드 AGE_TO_BUDGET(20/60/120)과 맞추고 싶으면 아래로 변경해도 됨
  const budget = useMemo(() => {
    if (age === "4-5") return 50;
    if (age === "6-7") return 100;
    return 150;
  }, [age]);

  const rawFile =
    (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [ldrUrl, setLdrUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const processingRef = useRef(false);

  useEffect(() => {
    if (!rawFile) return;
    if (processingRef.current || status !== "idle") return;

    let alive = true;
    const abort = new AbortController();

    // ✅ Spring PROCESS_TIMEOUT=900 기준 (프론트는 약간 짧게 885초에서 타임아웃)
    const PROCESS_TIMEOUT_SEC = 900;
    const FRONT_TIMEOUT_SEC = 885; // 여유 15초
    const POLL_INTERVAL = 2000;

    const maxAttempts = Math.ceil((FRONT_TIMEOUT_SEC * 1000) / POLL_INTERVAL);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runProcess = async () => {
      processingRef.current = true;
      setStatus("loading");

      try {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("age", age);
        formData.append("budget", String(budget));

        // 1) 생성 요청
        const startRes = await fetch("/api/kids/generate", {
          method: "POST",
          body: formData,
          signal: abort.signal,
        });

        if (!startRes.ok) {
          const errText = await startRes.text();
          throw new Error(`Start Error: ${errText}`);
        }

        const startData = await startRes.json();
        const jid = startData.jobId;
        if (!jid) throw new Error("No jobId received");

        if (!alive) return;
        setJobId(jid);

        // 2) 폴링
        let finalData: any = null;

        for (let i = 0; i < maxAttempts; i++) {
          if (!alive) return;
          await sleep(POLL_INTERVAL);

          const statusRes = await fetch(`/api/kids/jobs/${jid}`, {
            signal: abort.signal,
          });

          if (!statusRes.ok) {
            // 404는 인덱싱 지연 등으로 잠깐 나올 수 있어 그냥 continue
            console.warn(
              `[KidsPage] Polling failed: ${statusRes.status} jobId=${jid}`
            );
            continue;
          }

          const statusData = await statusRes.json();

          if (statusData.status === "FAILED") {
            throw new Error(statusData.errorMessage || "Generation failed");
          }

          if (statusData.status === "DONE") {
            finalData = statusData;
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
            break;
          }
        }

        if (!finalData) {
          throw new Error(
            `Timeout: exceeded ${FRONT_TIMEOUT_SEC}s (server PROCESS_TIMEOUT=${PROCESS_TIMEOUT_SEC}s)`
          );
        }

        // 3) 결과 처리
        const modelUrl = finalData.ldrUrl || finalData.modelKey;
        console.log("[KidsPage] Final Job Data:", finalData);

        if (!modelUrl) {
          const keys = Object.keys(finalData || {}).join(", ");
          throw new Error(`No model URL in job result. keys=${keys}`);
        }

        if (!alive) return;

        setLdrUrl(modelUrl);
        setStatus("done");
      } catch (e) {
        if (!alive) return;
        console.error("Brick generation failed:", e);
        setStatus("error");
      }
    };

    runProcess();

    return () => {
      alive = false;
      try {
        abort.abort();
      } catch {}
    };
  }, [rawFile, age, budget, status]);

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

            <button
              className="kidsPage__nextBtn"
              onClick={() => {
                const searchParams = new URL(window.location.href).searchParams;
                const ageParam = searchParams.get("age") || "4-5";
                navigate(
                  `/kids/steps?url=${encodeURIComponent(
                    ldrUrl
                  )}&jobId=${jobId ?? ""}&age=${ageParam}`
                );
              }}
            >
              {t.kids.generate.next}
            </button>
          </>
        )}

        {status === "error" && (
          <div className="kidsPage__error">
            {t.kids.generate.error.split("\n").map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        )}

        {showToast && (
          <div
            style={{
              position: "fixed",
              top: "80px",
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
            }}
          >
            {t.kids.generate.complete}
          </div>
        )}
      </div>
    </div>
  );
}
