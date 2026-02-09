import "./KidsPage.css";
import SEO from "../../components/SEO";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../Auth/AuthContext";

import { useJob } from "../../contexts/JobContext";

export default function KidsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { myApi } = useAuth();
  const { jobs, startJob, removeJob, findJob } = useJob();
  const [params] = useSearchParams();
  const location = useLocation();
  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10" | "PRO";

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const activeJob = currentJobId ? findJob(currentJobId) : null;

  const budget = useMemo(() => {
    if (age === "4-5") return 400;
    if (age === "6-7") return 450;
    if (age === "8-10") return 500;
    if (age === "PRO") return 2000;
    return 500;
  }, [age]);

  const rawFile =
    (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  // ✅ rawFile이 없으면 홈으로 리다이렉트 (파일 업로드 없이 직접 접근한 경우)
  useEffect(() => {
    if (!rawFile && !activeJob) {
      navigate("/", { replace: true });
    }
  }, [rawFile, activeJob, navigate]);

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [debugLog, setDebugLog] = useState<string>("");

  const processingRef = useRef(false);

  // Sync status and logs with activeJob
  useEffect(() => {
    if (!activeJob) return;

    if (activeJob.status === "DONE") {
      setStatus("done");
    } else if (activeJob.status === "FAILED") {
      setStatus("error");
      setDebugLog(activeJob.error || t.kids.generate.error);
    } else {
      setStatus("loading");
      setDebugLog(`${t.kids.generate.inProgress} [${activeJob.stage}]`);
    }
  }, [activeJob, t]);

  useEffect(() => {
    if (!rawFile) return;
    if (processingRef.current) return;

    // 로컬 상태가 이미 'done'인데 새로 들어온 파일이 있다면 초기화 필요
    if (status === "done") {
      setStatus("idle");
    }

    let alive = true;
    const abort = new AbortController();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runProcess = async () => {
      processingRef.current = true;
      setStatus("loading");

      await sleep(200);
      setDebugLog(t.kids.generate.starting);

      try {
        setDebugLog(t.kids.generate.uploadPrepare);
        const presign = await myApi.getPresignUrl(rawFile.type, rawFile.name);

        setDebugLog(t.kids.generate.uploading);
        const uploadRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          body: rawFile,
          headers: { "Content-Type": rawFile.type },
          signal: abort.signal,
        });

        if (!uploadRes.ok) throw new Error(`S3 Upload Error: ${uploadRes.status}`);

        setDebugLog(t.kids.generate.creating2);
        const fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");
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

        if (!startRes.ok) {
          const errText = await startRes.text();
          throw new Error(`Start Error: ${errText}`);
        }

        const startData = await startRes.json();
        const jid = startData.jobId;
        if (!jid) throw new Error("No jobId received");

        if (!alive) return;
        setCurrentJobId(jid);
        startJob(jid); // Hand off to global JobContext
      } catch (e: any) {
        if (!alive) return;
        setDebugLog(`${t.kids.generate.errorOccurred}: ${e.message}`);
        setStatus("error");
      }
    };

    runProcess();

    return () => {
      alive = false;
      try { abort.abort(); } catch { }
    };
  }, [rawFile, age, budget, startJob, myApi, t]); // ✅ activeJob 의존성 제거

  const percent = activeJob?.percent || 0;
  const ldrUrl = activeJob?.ldrUrl || null;
  const jobId = activeJob?.jobId || null;

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


      </div>
    </div>
  );
}
