'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPresignUrl } from "@/lib/api/myApi";
import KidsLoadingScreen from "@/components/kids/KidsLoadingScreen";
import './KidsPage.css';

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
const KidsModelSelectModal = dynamic(() => import("@/components/kids/KidsModelSelectModal"), { ssr: false });

function KidsPageContent() {
    const router = useRouter();
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const age = (searchParams.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";

    const budget = useMemo(() => {
        if (age === "4-5") return 50;
        if (age === "6-7") return 100;
        return 150;
    }, [age]);

    const [rawFile, setRawFile] = useState<File | null>(null);
    const [isFileLoaded, setIsFileLoaded] = useState(false);

    useEffect(() => {
        const storedData = sessionStorage.getItem('pendingUpload');
        if (storedData) {
            try {
                const { name, type, dataUrl } = JSON.parse(storedData);
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], name, { type });
                        setRawFile(file);
                        setIsFileLoaded(true);
                        sessionStorage.removeItem('pendingUpload');
                    });
            } catch (e) {
                console.error('Failed to restore file:', e);
                setIsFileLoaded(true);
            }
        } else {
            setIsFileLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isFileLoaded && !rawFile) {
            router.replace("/");
        }
    }, [rawFile, isFileLoaded, router]);

    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [ldrUrl, setLdrUrl] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [debugLog, setDebugLog] = useState<string>("");
    const [currentStage, setCurrentStage] = useState<string>("QUEUED");

    const processingRef = useRef(false);

    useEffect(() => {
        if (!rawFile) return;
        if (processingRef.current || status !== "idle") return;

        let alive = true;
        const abort = new AbortController();

        const FRONT_TIMEOUT_SEC = 1200;
        const POLL_INTERVAL = 2000;
        const maxAttempts = Math.ceil((FRONT_TIMEOUT_SEC * 1000) / POLL_INTERVAL);

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const runProcess = async () => {
            processingRef.current = true;
            setStatus("loading");
            await sleep(200);

            setDebugLog(t.kids.generate.starting);

            try {
                setDebugLog(t.kids.generate.uploadPrepare);
                console.log("[KidsPage] Requesting presign URL for:", rawFile.name);
                const presign = await getPresignUrl(rawFile.type, rawFile.name);

                setDebugLog(t.kids.generate.uploading);
                console.log("[KidsPage] Uploading to S3:", presign.uploadUrl);
                const uploadRes = await fetch(presign.uploadUrl, {
                    method: "PUT",
                    body: rawFile,
                    headers: { "Content-Type": rawFile.type },
                    signal: abort.signal,
                });

                if (!uploadRes.ok) {
                    throw new Error(`S3 Upload Error: ${uploadRes.status}`);
                }

                setDebugLog(t.kids.generate.creating2);
                const fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");

                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
                console.log("[KidsPage] Starting generation job...");
                const startRes = await fetch(`${API_BASE}/api/kids/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
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
                setJobId(jid);
                console.log("[KidsPage] Job created:", jid);
                setDebugLog(`${t.kids.generate.jobCreated} [${jid}]`);

                let finalData: any = null;
                for (let i = 0; i < maxAttempts; i++) {
                    if (!alive) return;
                    await sleep(POLL_INTERVAL);

                    console.log(`[KidsPage] Polling job ${jid} (attempt ${i}/${maxAttempts})...`);
                    const statusRes = await fetch(`${API_BASE}/api/kids/jobs/${jid}`, {
                        credentials: "include",
                        signal: abort.signal,
                    });

                    if (!statusRes.ok) {
                        console.warn("[KidsPage] Polling failed status:", statusRes.status);
                        setDebugLog(`${t.kids.generate.serverDelay} (${statusRes.status})`);
                        continue;
                    }

                    const statusData = await statusRes.json();
                    const stage = statusData.stage || statusData.status || "QUEUED";
                    setCurrentStage(stage);
                    console.log("[KidsPage] Job status:", statusData.status, "Stage:", stage);

                    let warningMsg = "";
                    if (statusData.status === "RUNNING" && statusData.stageUpdatedAt) {
                        const stageUpdatedTime = new Date(statusData.stageUpdatedAt).getTime();
                        const now = Date.now();
                        const minutesSinceUpdate = Math.floor((now - stageUpdatedTime) / 60000);

                        if (minutesSinceUpdate > 10) {
                            warningMsg = ` (${minutesSinceUpdate}m)`;
                        }
                    }

                    setDebugLog(`${t.kids.generate.inProgress} [${stage}] (${i}/${maxAttempts})${warningMsg}`);

                    if (statusData.status === "FAILED") {
                        console.error("[KidsPage] Job failed:", statusData.errorMessage);
                        throw new Error(statusData.errorMessage || "Generation failed");
                    }

                    if (statusData.status === "DONE") {
                        console.log("[KidsPage] Job completed!");
                        finalData = statusData;
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 5000);
                        break;
                    }
                }

                if (!finalData) {
                    throw new Error(`Timeout: exceeded ${FRONT_TIMEOUT_SEC}s`);
                }

                const modelUrl = finalData.ldrUrl || finalData.modelKey;
                setDebugLog(t.kids.generate.loadingResult);

                if (!modelUrl) {
                    throw new Error("No model URL in job result");
                }

                if (!alive) return;

                setLdrUrl(modelUrl);
                setStatus("done");
            } catch (e: any) {
                if (!alive) return;
                console.error("Brick generation failed:", e);
                setDebugLog(`${t.kids.generate.errorOccurred}: ${e.message}`);
                setStatus("error");
            }
        };

        runProcess();

        return () => {
            alive = false;
            try { abort.abort(); } catch { }
        };
    }, [rawFile, age, budget, status, t]);

    const percent = useMemo(() => {
        if (status === "done") return 100;
        if (status !== "loading") return 0;

        const stageProgress: Record<string, number> = {
            "QUEUED": 15,
            "RUNNING": 25,
            "THREE_D_PREVIEW": 50,
            "MODEL": 80,
            "BLUEPRINT": 90,
            "DONE": 100,
        };

        return stageProgress[currentStage] || 15;
    }, [status, currentStage]);

    if (!isFileLoaded) {
        return <div className="page">Loading...</div>;
    }

    return (
        <div className="page">
            <Background3D entryDirection="float" />

            <div className="center">
                {status === "loading" && (
                    <>
                        <div className="debugLog">{debugLog}</div>
                        <KidsLoadingScreen percent={percent} />
                    </>
                )}

                {status === "done" && ldrUrl && (
                    <>
                        <div className="resultTitle">{t.kids.generate.ready}</div>
                        <div className="resultCard">
                            <div className="viewer3d">
                                <KidsLdrPreview url={ldrUrl} />
                            </div>
                        </div>

                        <button
                            className="nextBtn"
                            onClick={() => {
                                router.push(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId ?? ""}&age=${age}`);
                            }}
                        >
                            {t.kids.generate.next}
                        </button>
                    </>
                )}

                {status === "error" && (
                    <div className="error">
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.kids.generate.failed}</div>
                        {t.kids.generate.error}
                        <br />
                        <span style={{ fontSize: "0.8em", color: "#d32f2f" }}>{debugLog}</span>
                    </div>
                )}

                {showToast && (
                    <div className="toast">
                        {t.kids.generate.complete}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KidsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KidsPageContent />
        </Suspense>
    );
}

