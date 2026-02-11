'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import * as gtag from "@/lib/gtag";
import { getPresignUrl } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, ThemeInfo } from "@/lib/api/colorVariantApi";
// import KidsLoadingScreen from "@/components/kids/KidsLoadingScreen";
import PuzzleMiniGame from "@/components/kids/PuzzleMiniGame";
import { registerToGallery } from "@/lib/api/myApi";
import { useJobStore } from "@/stores/jobStore";
import { generatePdfFromServer } from "@/components/kids/PDFGenerator";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
const KidsModelSelectModal = dynamic(() => import("@/components/kids/KidsModelSelectModal"), { ssr: false });

import { KidsLdrPreviewHandle } from "@/components/kids/KidsLdrPreview";

function KidsPageContent() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();
    const searchParams = useSearchParams();
    const age = (searchParams.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10" | "PRO";

    const budget = useMemo(() => {
        if (age === "4-5") return 400;
        if (age === "6-7") return 800;
        if (age === "8-10") return 1200;
        if (age === "PRO") return 5000;
        return 1200;
    }, [age]);

    const [rawFile, setRawFile] = useState<File | null>(null);
    const [targetPrompt, setTargetPrompt] = useState<string | null>(null); // New state
    const [isFileLoaded, setIsFileLoaded] = useState(false);

    useEffect(() => {
        const storedUpload = sessionStorage.getItem('pendingUpload');
        const storedPrompt = sessionStorage.getItem('pendingPrompt');

        if (storedUpload) {
            try {
                const { name, type, dataUrl } = JSON.parse(storedUpload);
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
        } else if (storedPrompt || searchParams.get("prompt")) {
            setTargetPrompt(storedPrompt || searchParams.get("prompt"));
            setIsFileLoaded(true);
            sessionStorage.removeItem('pendingPrompt');
        } else {
            setIsFileLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isFileLoaded && !rawFile && !targetPrompt) {
            router.replace("/");
        }
    }, [rawFile, targetPrompt, isFileLoaded, router]);

    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [ldrUrl, setLdrUrl] = useState<string | null>(null);
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string>("");
    const [currentStage, setCurrentStage] = useState<string>("QUEUED");
    const [agentLogs, setAgentLogs] = useState<string[]>([]);

    // 공유하기 관련
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [brickCount, setBrickCount] = useState<number>(0);
    const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string> | null>(null);
    const [jobTitle, setJobTitle] = useState<string>("");

    // 색상 변경 관련
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);

    // 다운로드 드롭다운 상태
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);

    // 3D 프리뷰 ref 및 PDF 생성 상태
    const previewRef = useRef<KidsLdrPreviewHandle>(null);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    const processingRef = useRef(false);

    useEffect(() => {
        const promptText = (targetPrompt ?? "").trim();
        if (!rawFile && !promptText) return;
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

            // React가 Background3D를 언마운트할 시간 확보 (WebGL Context Lost 방지)
            await sleep(200);

            setDebugLog(t.kids.generate.starting);
            console.log("[KidsPage] 🚀 runProcess 시작 | file:", rawFile?.name, "prompt:", targetPrompt);

            gtag.event({
                action: 'generate_start',
                category: 'Kids',
                label: targetPrompt ? 'prompt' : 'image',
                value: budget,
                prompt: targetPrompt || undefined
            });

            try {
                let sourceImageUrl = "";
                let fileTitle = "prompt_gen";

                if (rawFile) {
                    // 1. Presigned URL 요청

                    setDebugLog(t.kids.generate.uploadPrepare);
                    console.log("[KidsPage] 📤 Step 1: Presigned URL 요청 중...");
                    const presign = await getPresignUrl(rawFile.type, rawFile.name);
                    console.log("[KidsPage] ✅ Step 1 완료 | uploadUrl:", presign.uploadUrl?.substring(0, 80) + "...");
                    console.log("[KidsPage]    publicUrl:", presign.publicUrl);
                    if (alive) setJobThumbnailUrl(presign.publicUrl);

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
                    } catch (fetchError) {
                        console.error("[KidsPage] ❌ fetch 자체 에러:", fetchError);
                        console.error("[KidsPage] ❌ 에러 타입:", fetchError instanceof Error ? fetchError.name : "unknown");
                        console.error("[KidsPage] ❌ 에러 메시지:", fetchError instanceof Error ? fetchError.message : String(fetchError));
                        throw fetchError;
                    }

                    console.log("[KidsPage] ✅ Step 2 완료 | S3 Upload status:", uploadRes.status);

                    if (!uploadRes.ok) {
                        console.error("[KidsPage] ❌ S3 Upload 실패 | status:", uploadRes.status);
                        throw new Error(`S3 Upload Error: ${uploadRes.status}`);
                    }
                    sourceImageUrl = presign.publicUrl;
                    fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");
                } else if (promptText) {
                    console.log("[KidsPage] 🚀 Prompt 모드 진입: S3 업로드 스킵");
                    fileTitle = promptText.substring(0, 10);
                } else {
                    setStatus("error");
                    setDebugLog(t.kids.modelSelect.promptInputPlaceholder || "sourceImageUrl 또는 prompt가 필요합니다.");
                    processingRef.current = false;
                    return;
                }

                // 3. Backend에 S3 URL or Prompt 전달 (JSON)
                setDebugLog(t.kids.generate.creating2);

                console.log("[KidsPage] 📤 Step 3: /api/kids/generate 호출 시작...");
                console.log("[KidsPage]    payload:", { sourceImageUrl, prompt: promptText, age, budget, title: fileTitle });

                const startRes = await authFetch('/api/kids/generate', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceImageUrl: sourceImageUrl || undefined, // prompt 모드면 undefined
                        prompt: promptText || undefined,
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
                console.log("[KidsPage] 🎯 Job 생성 완료 | jobId:", jid);
                setDebugLog(`${t.kids.generate.jobCreated} [${jid}]`);

                // 전역 store에 job 등록 (폴링은 페이지 이탈 시 시작)
                useJobStore.getState().setActiveJob({ jobId: jid, status: 'QUEUED', age });

                // 4. 폴링
                let finalData: any = null;
                console.log("[KidsPage] 🔄 Step 4: 폴링 시작 | maxAttempts:", maxAttempts, "| interval:", POLL_INTERVAL);

                for (let i = 0; i < maxAttempts; i++) {
                    if (!alive) {
                        console.log("[KidsPage] ⚠️ 폴링 중단 (alive=false)");
                        return;
                    }
                    await sleep(POLL_INTERVAL);

                    const statusRes = await authFetch(`/api/kids/jobs/${jid}`, {
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
                    setCurrentStage(stage);

                    // Stale Job 감지 (10분 동안 진행 없음)
                    let warningMsg = "";
                    if (statusData.status === "RUNNING" && statusData.stageUpdatedAt) {
                        const stageUpdatedTime = new Date(statusData.stageUpdatedAt).getTime();
                        const now = Date.now();
                        const minutesSinceUpdate = Math.floor((now - stageUpdatedTime) / 60000);

                        if (minutesSinceUpdate > 10) {
                            warningMsg = ` ⚠️ AI 응답 없음 (${minutesSinceUpdate}m)`;
                            console.warn(`[KidsPage] Stale job detected | jobId=${jid} | minutes=${minutesSinceUpdate}`);
                        }
                    }

                    setDebugLog(`${t.kids.generate.inProgress} [${stage}] (${i}/${maxAttempts})${warningMsg}`);

                    if (statusData.status === "FAILED") {
                        console.error("[KidsPage] ❌ Job FAILED | error:", statusData.errorMessage);
                        // store 상태도 업데이트
                        useJobStore.getState().setActiveJob({
                            jobId: jid,
                            status: 'FAILED',
                            age
                        });
                        throw new Error(statusData.errorMessage || "Generation failed");
                    }

                    if (statusData.status === "DONE") {
                        console.log("[KidsPage] ✅ Job DONE! | ldrUrl:", statusData.ldrUrl);
                        finalData = statusData;
                        if (alive && statusData.glbUrl) setGlbUrl(statusData.glbUrl);

                        // 공유용 추가 데이터 저장
                        if (statusData.suggestedTags) setSuggestedTags(statusData.suggestedTags);
                        if (statusData.parts) setBrickCount(statusData.parts);
                        if (statusData.screenshotUrls) setScreenshotUrls(statusData.screenshotUrls);
                        if (statusData.title) setJobTitle(statusData.title);

                        // 전역 토스트 표시 예약 (페이지 이탈 시 표시되도록)
                        useJobStore.getState().setShowDoneToast(true);

                        // store 상태도 업데이트 (페이지 이탈 시 폴링 안 하도록)
                        useJobStore.getState().setActiveJob({
                            jobId: jid,
                            status: 'DONE',
                            ldrUrl: statusData.ldrUrl,
                            glbUrl: statusData.glbUrl,
                            age
                        });
                        break;
                    }
                }

                if (!finalData) {
                    console.error("[KidsPage] ❌ Timeout | exceeded", FRONT_TIMEOUT_SEC, "seconds");
                    throw new Error(`Timeout: exceeded ${FRONT_TIMEOUT_SEC}s`);
                }

                // 5. 결과 처리
                const modelUrl = finalData.ldrUrl || finalData.modelKey;
                console.log("[KidsPage] 🎉 Final Job Data:", finalData);
                setDebugLog(t.kids.generate.loadingResult);

                if (!modelUrl) {
                    console.error("[KidsPage] ❌ No model URL in result");
                    throw new Error("No model URL in job result");
                }

                if (!alive) return;

                setLdrUrl(modelUrl);
                setGlbUrl(finalData.glbUrl || finalData.glb_url);
                if (finalData.pdfUrl) setPdfUrl(finalData.pdfUrl);
                setStatus("done");
                console.log("[KidsPage] ✅ 전체 프로세스 완료! | ldrUrl:", modelUrl);

                gtag.event({
                    action: 'generate_success',
                    category: 'Kids',
                    label: jobId || 'unknown',
                    prompt: targetPrompt || undefined,
                    suggested_tags: finalData.suggestedTags?.join(', ') || undefined,
                    brick_count: finalData.parts || undefined
                });
            } catch (e) {
                if (!alive) return;
                console.error("[KidsPage] ❌ Brick generation failed:", e);
                setDebugLog(`${t.kids.generate.errorOccurred}: ${e instanceof Error ? e.message : String(e)}`);
                setStatus("error");
            }
        };

        runProcess();

        return () => {
            alive = false;
            try { abort.abort(); } catch { }

            // 페이지 이탈 시 완료 안 됐으면 백그라운드 폴링 시작 (알림용)
            const currentJob = useJobStore.getState().activeJob;
            if (currentJob && currentJob.status !== 'DONE' && currentJob.status !== 'FAILED') {
                console.log("[KidsPage] 페이지 이탈 - 백그라운드 폴링 시작");
                useJobStore.getState().startPolling(currentJob.jobId, currentJob.age);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawFile, targetPrompt, age, budget]); // status 제거 - status 변경 시 cleanup이 abort를 호출해서 fetch 취소됨

    // SSE: CoScientist 에이전트 로그 스트리밍
    useEffect(() => {
        console.log(`[SSE] useEffect triggered | jobId=${jobId} | status=${status}`);
        if (!jobId || status !== "loading") {
            console.log(`[SSE] Skipping - conditions not met`);
            return;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const sseUrl = `${apiBase}/api/kids/jobs/${encodeURIComponent(jobId)}/logs/stream`;
        console.log(`[SSE] Connecting to: ${sseUrl}`);
        const es = new EventSource(sseUrl);
        let errorCount = 0;

        es.addEventListener("agent-log", (e) => {
            errorCount = 0;
            setAgentLogs(prev => {
                const next = [...prev, e.data];
                return next.length > 50 ? next.slice(-50) : next;
            });
        });

        es.onerror = () => {
            errorCount++;
            console.warn(`[SSE] Agent log stream error (${errorCount})`);
            if (errorCount >= 5) {
                console.warn("[SSE] Too many errors, closing connection");
                es.close();
            }
        };

        return () => { es.close(); };
    }, [jobId, status]);

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

    const downloadLdr = async () => {
        if (!ldrUrl) return;
        try {
            const res = await fetch(ldrUrl);
            const text = await res.text();
            const blob = new Blob([text], { type: "text/plain" });
            const dUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dUrl;
            link.download = `brickers_${jobId || 'model'}.ldr`;
            link.click();
            URL.revokeObjectURL(dUrl);
            gtag.event({ action: 'download_ldr', category: 'Download', label: jobId || 'model' });
        } catch (err) { console.error(err); }
    };

    const downloadGlb = () => {
        if (!glbUrl) return;
        const link = document.createElement("a");
        link.href = glbUrl;
        link.download = `brickers_${jobId || 'model'}.glb`;
        link.click();
        gtag.event({ action: 'download_glb', category: 'Download', label: jobId || 'model' });
    };

    // 색상 모달 열 때 테마 로드
    const openColorModal = async () => {
        setIsColorModalOpen(true);
        if (colorThemes.length === 0) {
            try {
                const themes = await getColorThemes();
                setColorThemes(themes);
            } catch (e) {
                console.error("테마 로드 실패:", e);
            }
        }
    };

    // 색상 변경 적용
    const handleApplyColor = async () => {
        if (!selectedTheme || !ldrUrl) return;

        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(ldrUrl, selectedTheme, authFetch);

            if (result.ok && result.ldrData) {
                const newBlobUrl = base64ToBlobUrl(result.ldrData);
                setLdrUrl(newBlobUrl);
                setIsColorModalOpen(false);
                alert(`${result.themeApplied} ${t.kids.steps.colorThemeApplied} (${result.changedBricks}개 브릭 변경)`);
            } else {
                alert(result.message || t.kids.steps.colorThemeFailed);
            }
        } catch (e) {
            console.error("색상 변경 실패:", e);
            alert(e instanceof Error ? e.message : t.kids.steps.colorThemeError);
        } finally {
            setIsApplyingColor(false);
        }
    };
    if (!isFileLoaded) {
        return <div className="page">Loading...</div>;
    }

    // 공유하기 핸들러
    const handleShare = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl);
            alert("링크가 복사되었습니다!");
            return;
        }

        setIsSharing(true);
        try {
            const res = await registerToGallery({
                jobId: jobId || undefined,
                title: jobTitle || "브릭 도안",
                content: "생성된 브릭 도안입니다.",
                tags: suggestedTags.length > 0 ? suggestedTags : ["Kids", "Brick"],
                thumbnailUrl: jobThumbnailUrl || undefined,
                ldrUrl: ldrUrl || undefined,
                glbUrl: glbUrl || undefined,
                parts: brickCount || undefined,
                screenshotUrls: screenshotUrls || undefined,
                visibility: "PUBLIC",
            });

            const safeTitle = (res.title || "brick").replace(/[^a-zA-Z0-9가-힣]/g, "-");
            const url = `${window.location.origin}/gallery/${safeTitle}-${res.id}`;
            setShareUrl(url);

            await navigator.clipboard.writeText(url);
            alert("링크가 복사되었습니다!");
        } catch (err: unknown) {
            if (err instanceof Error && err.message?.includes("이미 갤러리에 등록")) {
                alert("이미 공유된 도안입니다.");
            } else {
                alert("공유에 실패했습니다.");
            }
        } finally {
            setIsSharing(false);
        }
    };

    // PDF 다운로드 핸들러
    const handleDownloadPdf = async () => {
        // 이미 서버에서 생성된 PDF가 있으면 그냥 엶
        if (pdfUrl) {
            window.open(pdfUrl, "_blank");
            return;
        }

        // 없으면 클라이언트 캡처 기반 생성 시도
        if (!ldrUrl || !previewRef.current || isPdfGenerating) return;

        try {
            setIsPdfGenerating(true);
            setDebugLog(t.kids?.steps?.pdfGenerating || "📸 3D 모델 캡처 및 PDF 생성 중...");

            // 1. 캡처 실행
            const stepImages = await previewRef.current.captureAllSteps();
            if (stepImages.length === 0) throw new Error(t.jobs?.noCapturedImage || 'No captured image');

            // 2. 서버 요청
            const generatedPdfUrl = await generatePdfFromServer(ldrUrl, jobId || "model", stepImages);

            // 3. 다운로드
            window.open(generatedPdfUrl, "_blank");
            setDebugLog(t.kids?.steps?.pdfDownloadComplete || "✅ PDF 다운로드 완료");
        } catch (e) {
            console.error("PDF Download Error:", e);
            alert(t.kids?.steps?.colorThemeError || "PDF 생성 중 오류가 발생했습니다.");
            setDebugLog(`${t.kids?.steps?.pdfError || "❌ PDF 오류"}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="page">
            <Background3D entryDirection="float" />

            <div className="center">
                {status === "loading" && (
                    <>
                        <PuzzleMiniGame percent={percent} message={agentLogs.length > 0 ? (() => {
                            const last = agentLogs[agentLogs.length - 1];
                            const match = last.match(/^\[(.+?)\]\s*/);
                            const step = match?.[1];
                            return (step && t.sse?.[step]) || last.replace(/^\[.*?\]\s*/, '');
                        })() : undefined} />
                    </>
                )}

                {status === "done" && ldrUrl && (
                    <>
                        <div className="resultTitle">{t.kids.generate.ready}</div>
                        <div className="resultCard" style={{ position: 'relative' }}>
                            <div className="viewer3d">
                                <KidsLdrPreview key={ldrUrl} url={ldrUrl} ref={previewRef} />
                            </div>

                            {/* 우측 하단 Next 버튼 */}
                            <button
                                className="nextBtn nextBtn--ab"
                                onClick={() => {
                                    router.push(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId ?? ""}&age=${age}${pdfUrl ? `&pdfUrl=${encodeURIComponent(pdfUrl)}` : ""}`);
                                }}
                            >
                                {t.kids.generate.next}
                            </button>
                        </div>

                        {/* 하단 버튼 그룹 */}
                        <div className="actionBtns">
                            {/* 다운로드 드롭다운 */}
                            <div className="dropdownContainer">
                                <button
                                    className="dlBtn"
                                    onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                                >
                                    Download ▼
                                </button>
                                {isDownloadOpen && (
                                    <div className="dropdownMenu">
                                        <button onClick={downloadLdr}>LDR Download</button>
                                        {glbUrl && <button onClick={downloadGlb}>GLB Download</button>}
                                        <button onClick={handleDownloadPdf} disabled={isPdfGenerating}>
                                            {isPdfGenerating ? "PDF Generating..." : "PDF Download"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                className="dlBtn"
                                onClick={handleShare}
                                disabled={isSharing}
                            >
                                {isSharing ? "공유 중..." : shareUrl ? "링크 복사" : "공유하기"}
                            </button>

                            <button className="dlBtn colorBtn" onClick={openColorModal} style={{ display: 'none' }}>
                                {t.kids.steps?.changeColor || '색상 변경'}
                            </button>
                        </div>
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

                {/* 색상 변경 모달 */}
                {isColorModalOpen && (
                    <div className="colorModalOverlay" onClick={() => setIsColorModalOpen(false)}>
                        <div className="colorModal" onClick={(e) => e.stopPropagation()}>
                            <button className="modalCloseBtn" onClick={() => setIsColorModalOpen(false)} aria-label="close">✕</button>
                            <h3 className="colorModal__title">🎨 {t.kids.steps?.colorThemeTitle || "색상 테마 선택"}</h3>

                            <div className="colorModal__themes">
                                {colorThemes.length === 0 ? (
                                    <div className="colorModal__loading">{t.common?.loading || "테마 로딩 중..."}</div>
                                ) : (
                                    colorThemes.map((theme) => (
                                        <button
                                            key={theme.name}
                                            className={`colorModal__themeBtn ${selectedTheme === theme.name ? "colorModal__themeBtn--selected" : ""}`}
                                            onClick={() => setSelectedTheme(theme.name)}
                                        >
                                            <span className="colorModal__themeName">{theme.name}</span>
                                            <span className="colorModal__themeDesc">{theme.description}</span>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="colorModal__actions">
                                <button
                                    className="colorModal__btn colorModal__btn--cancel"
                                    onClick={() => setIsColorModalOpen(false)}
                                >
                                    {t.common.cancel}
                                </button>
                                <button
                                    className="colorModal__btn colorModal__btn--confirm"
                                    onClick={handleApplyColor}
                                    disabled={!selectedTheme || isApplyingColor}
                                >
                                    {isApplyingColor ? (t.common?.applying || '...') : (t.common?.apply || '적용')}
                                </button>
                            </div>
                        </div>
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
