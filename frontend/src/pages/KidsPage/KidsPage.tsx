import "./KidsPage.css";
import SEO from "../../components/SEO";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";
import { useLanguage } from "../../contexts/LanguageContext";
import { getPresignUrl } from "../../api/myApi";

export default function KidsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const location = useLocation();
  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";

  // ... (existing constants)
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
  const [debugLog, setDebugLog] = useState<string>(""); // ✅ 디버그용 로그
  const [currentStage, setCurrentStage] = useState<string>("QUEUED"); // ✅ 현재 stage

  const processingRef = useRef(false);

  useEffect(() => {
    if (!rawFile) return;
    if (processingRef.current || status !== "idle") return;

    let alive = true;
    const abort = new AbortController();

    const FRONT_TIMEOUT_SEC = 1200;  // 20분 (AI 처리 최대 30분이므로 여유 있게)
    const POLL_INTERVAL = 2000;

    const maxAttempts = Math.ceil((FRONT_TIMEOUT_SEC * 1000) / POLL_INTERVAL);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runProcess = async () => {
      processingRef.current = true;
      setStatus("loading");

      // ✅ React가 Background3D를 언마운트할 시간 확보 (WebGL Context Lost 방지)
      await sleep(200);

      setDebugLog(t.kids.generate.starting);
      console.log("[KidsPage] 🚀 runProcess 시작 | file:", rawFile.name, rawFile.type, rawFile.size);

      try {
        // 1. Presigned URL 요청
        setDebugLog(t.kids.generate.uploadPrepare);
        console.log("[KidsPage] 📤 Step 1: Presigned URL 요청 중...");
        const presign = await getPresignUrl(rawFile.type, rawFile.name);
        console.log("[KidsPage] ✅ Step 1 완료 | uploadUrl:", presign.uploadUrl?.substring(0, 80) + "...");
        console.log("[KidsPage]    publicUrl:", presign.publicUrl);

        // 2. S3에 직접 업로드
        setDebugLog(t.kids.generate.uploading);
        console.log("[KidsPage] 📤 Step 2: S3 업로드 시작...");
        console.log("[KidsPage] 📤 fetch 호출 직전 | url:", presign.uploadUrl?.substring(0, 100));

        let uploadRes: Response;
        try {
          uploadRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            body: rawFile,
            headers: { "Content-Type": rawFile.type },
            signal: abort.signal,
          });
          console.log("[KidsPage] ✅ fetch 완료 | status:", uploadRes.status);
        } catch (fetchError: any) {
          console.error("[KidsPage] ❌ fetch 자체 에러:", fetchError);
          console.error("[KidsPage] ❌ 에러 타입:", fetchError?.name);
          console.error("[KidsPage] ❌ 에러 메시지:", fetchError?.message);
          throw fetchError;
        }

        console.log("[KidsPage] ✅ Step 2 완료 | S3 Upload status:", uploadRes.status);

        if (!uploadRes.ok) {
          console.error("[KidsPage] ❌ S3 Upload 실패 | status:", uploadRes.status);
          throw new Error(`S3 Upload Error: ${uploadRes.status}`);
        }

        // 3. Backend에 S3 URL 전달 (JSON)
        setDebugLog(t.kids.generate.creating2);
        // 파일명에서 확장자 제거하여 제목으로 사용
        const fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");
        console.log("[KidsPage] 📤 Step 3: /api/kids/generate 호출 시작...");
        console.log("[KidsPage]    payload:", { sourceImageUrl: presign.publicUrl, age, budget, title: fileTitle });
        const startRes = await fetch("/api/kids/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceImageUrl: presign.publicUrl,
            age,
            budget,
            title: fileTitle,
          }),
          signal: abort.signal,
        });
        console.log("[KidsPage] ✅ Step 3 응답 받음 | status:", startRes.status);

        if (!startRes.ok) {
          const errText = await startRes.text();
          console.error("[KidsPage] ❌ /api/kids/generate 실패 | status:", startRes.status, "| error:", errText);
          throw new Error(`Start Error: ${errText}`);
        }

        const startData = await startRes.json();
        console.log("[KidsPage] ✅ Step 3 완료 | response:", startData);
        const jid = startData.jobId;
        if (!jid) throw new Error("No jobId received");

        if (!alive) return;
        setJobId(jid);
        setDebugLog(`${t.kids.generate.jobCreated} [${jid}]`);
        console.log("[KidsPage] 🎯 Job 생성 완료 | jobId:", jid);

        // 2) 폴링
        let finalData: any = null;
        console.log("[KidsPage] 🔄 Step 4: 폴링 시작 | maxAttempts:", maxAttempts, "| interval:", POLL_INTERVAL);

        for (let i = 0; i < maxAttempts; i++) {
          if (!alive) {
            console.log("[KidsPage] ⚠️ 폴링 중단 (alive=false)");
            return;
          }
          await sleep(POLL_INTERVAL);

          const statusRes = await fetch(`/api/kids/jobs/${jid}`, {
            signal: abort.signal,
          });

          if (!statusRes.ok) {
            console.warn(`[KidsPage] ⚠️ Polling failed: ${statusRes.status}`);
            setDebugLog(`${t.kids.generate.serverDelay} (${statusRes.status})`);
            continue;
          }

          const statusData = await statusRes.json();
          const stage = statusData.stage || statusData.status || "QUEUED";
          console.log(`[KidsPage] 📊 Poll #${i + 1} | status: ${statusData.status} | stage: ${stage}`);
          setCurrentStage(stage); // ✅ stage 업데이트

          // ✅ Stale Job 감지 (10분 동안 진행 없음)
          let warningMsg = "";
          if (statusData.status === "RUNNING" && statusData.stageUpdatedAt) {
            const stageUpdatedTime = new Date(statusData.stageUpdatedAt).getTime();
            const now = Date.now();
            const minutesSinceUpdate = Math.floor((now - stageUpdatedTime) / 60000);

            if (minutesSinceUpdate > 10) {
              warningMsg = ` ⚠️ ${t.kids.generate.aiNoResponse} (${minutesSinceUpdate}m)`;
              console.warn(`[KidsPage] Stale job detected | jobId=${jid} | minutes=${minutesSinceUpdate}`);
            }
          }

          setDebugLog(`${t.kids.generate.inProgress} [${stage}] (${i}/${maxAttempts})${warningMsg}`);

          if (statusData.status === "FAILED") {
            console.error("[KidsPage] ❌ Job FAILED | error:", statusData.errorMessage);
            throw new Error(statusData.errorMessage || "Generation failed");
          }

          if (statusData.status === "DONE") {
            console.log("[KidsPage] ✅ Job DONE! | ldrUrl:", statusData.ldrUrl);
            finalData = statusData;
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
            break;
          }
        }

        if (!finalData) {
          console.error("[KidsPage] ❌ Timeout | exceeded", FRONT_TIMEOUT_SEC, "seconds");
          throw new Error(
            `Timeout: exceeded ${FRONT_TIMEOUT_SEC}s`
          );
        }

        // 3) 결과 처리
        const modelUrl = finalData.ldrUrl || finalData.modelKey;
        console.log("[KidsPage] 🎉 Final Job Data:", finalData);
        setDebugLog(t.kids.generate.loadingResult);

        if (!modelUrl) {
          console.error("[KidsPage] ❌ No model URL in result");
          throw new Error("No model URL in job result");
        }

        if (!alive) return;

        setLdrUrl(modelUrl);
        setStatus("done");
        console.log("[KidsPage] ✅ 전체 프로세스 완료! | ldrUrl:", modelUrl);
      } catch (e: any) {
        if (!alive) return;
        console.error("[KidsPage] ❌ Brick generation failed:", e);
        setDebugLog(`${t.kids.generate.errorOccurred}: ${e.message}`);
        setStatus("error");
      }
    };

    runProcess();

    return () => {
      alive = false;
      try { abort.abort(); } catch { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFile, age, budget]); // status 제거 - status 변경 시 cleanup이 abort를 호출해서 fetch 취소됨

  // ✅ stage 기반 진행률 계산
  const percent = useMemo(() => {
    if (status === "done") return 100;
    if (status !== "loading") return 0;

    // stage 기반 진행률
    const stageProgress: Record<string, number> = {
      "QUEUED": 15,
      "RUNNING": 25,
      "THREE_D_PREVIEW": 50,  // Tripo 3D 생성 중
      "MODEL": 80,             // Brickify LDR 변환 중
      "BLUEPRINT": 90,
      "DONE": 100,
    };

    return stageProgress[currentStage] || 15;
  }, [status, currentStage]);

  return (
    <div className="kidsPage">
      <SEO
        title="Create LEGO"
        description="Upload your image and create your own LEGO model with AI."
        keywords="create, upload, image to lego, ai generation"
      />
      <Background3D entryDirection="float" />

      <div className="kidsPage__center">
        {status === "loading" && (
          <>
            {/* <div className="kidsPage__title">{t.kids.generate.loading}</div> */}
            {/* 디버그 로그 표시 */}
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px", fontFamily: "monospace" }}>
              {debugLog}
            </div>
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
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.kids.generate.failed}</div>
            {t.kids.generate.error}
            <br />
            <span style={{ fontSize: "0.8em", color: "#d32f2f" }}>{debugLog}</span>
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
