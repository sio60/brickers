'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPresignUrl } from "@/lib/api/myApi";
import styles from "./KidsPage.module.css";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
const FloatingMenuButton = dynamic(() => import("@/components/kids/FloatingMenuButton"), { ssr: false });

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

    // sessionStorage에서 파일 데이터 복원
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [isFileLoaded, setIsFileLoaded] = useState(false);

    useEffect(() => {
        const storedData = sessionStorage.getItem('pendingUpload');
        if (storedData) {
            try {
                const { name, type, dataUrl } = JSON.parse(storedData);
                // dataUrl을 File로 변환
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

    // 파일이 없으면 홈으로 리다이렉트
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
                // 1. Presigned URL 요청
                setDebugLog(t.kids.generate.uploadPrepare);
                const presign = await getPresignUrl(rawFile.type, rawFile.name);

                // 2. S3에 직접 업로드
                setDebugLog(t.kids.generate.uploading);
                const uploadRes = await fetch(presign.uploadUrl, {
                    method: "PUT",
                    body: rawFile,
                    headers: { "Content-Type": rawFile.type },
                    signal: abort.signal,
                });

                if (!uploadRes.ok) {
                    throw new Error(`S3 Upload Error: ${uploadRes.status}`);
                }

                // 3. Backend에 S3 URL 전달
                setDebugLog(t.kids.generate.creating2);
                const fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");

                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
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
                setDebugLog(`${t.kids.generate.jobCreated} [${jid}]`);

                // 4. 폴링
                let finalData: any = null;
                for (let i = 0; i < maxAttempts; i++) {
                    if (!alive) return;
                    await sleep(POLL_INTERVAL);

                    const statusRes = await fetch(`${API_BASE}/api/kids/jobs/${jid}`, {
                        credentials: "include",
                        signal: abort.signal,
                    });

                    if (!statusRes.ok) {
                        setDebugLog(`${t.kids.generate.serverDelay} (${statusRes.status})`);
                        continue;
                    }

                    const statusData = await statusRes.json();
                    const stage = statusData.stage || statusData.status || "QUEUED";
                    setCurrentStage(stage);

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
                    throw new Error(`Timeout: exceeded ${FRONT_TIMEOUT_SEC}s`);
                }

                // 5. 결과 처리
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

    // stage 기반 진행률 계산
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
        return <div className={styles.page}>Loading...</div>;
    }

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

            <div className={styles.center}>
                {status === "loading" && (
                    <>
                        <div className={styles.debugLog}>{debugLog}</div>
                        <div className={styles.loadingBar}>
                            <div className={styles.loadingProgress} style={{ width: `${percent}%` }} />
                        </div>
                        <div className={styles.loadingText}>{t.kids.generate.loading}</div>
                    </>
                )}

                {status === "done" && ldrUrl && (
                    <>
                        <div className={styles.resultTitle}>{t.kids.generate.ready}</div>
                        <div className={styles.resultCard}>
                            <div className={styles.viewer3d}>
                                <KidsLdrPreview url={ldrUrl} />
                            </div>
                        </div>

                        <button
                            className={styles.nextBtn}
                            onClick={() => {
                                router.push(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId ?? ""}&age=${age}`);
                            }}
                        >
                            {t.kids.generate.next}
                        </button>
                    </>
                )}

                {status === "error" && (
                    <div className={styles.error}>
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.kids.generate.failed}</div>
                        {t.kids.generate.error}
                        <br />
                        <span style={{ fontSize: "0.8em", color: "#d32f2f" }}>{debugLog}</span>
                    </div>
                )}

                {showToast && (
                    <div className={styles.toast}>
                        {t.kids.generate.complete}
                    </div>
                )}
            </div>

            <FloatingMenuButton />
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
