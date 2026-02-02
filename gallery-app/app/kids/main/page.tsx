'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getPresignUrl } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, ThemeInfo } from "@/lib/api/colorVariantApi";
// import KidsLoadingScreen from "@/components/kids/KidsLoadingScreen";
import BrickStackMiniGame from "@/components/kids/BrickStackMiniGame";
import './KidsPage.css';

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
const KidsModelSelectModal = dynamic(() => import("@/components/kids/KidsModelSelectModal"), { ssr: false });

function KidsPageContent() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();
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
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [debugLog, setDebugLog] = useState<string>("");
    const [currentStage, setCurrentStage] = useState<string>("QUEUED");

    // 색상 변경 관련
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);

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

            // React가 Background3D를 언마운트할 시간 확보 (WebGL Context Lost 방지)
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
                const fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");

                console.log("[KidsPage] 📤 Step 3: /api/kids/generate 호출 시작...");
                console.log("[KidsPage]    payload:", { sourceImageUrl: presign.publicUrl, age, budget, title: fileTitle });

                const startRes = await authFetch('/api/kids/generate', {
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
                console.log("[KidsPage] 🎯 Job 생성 완료 | jobId:", jid);
                setDebugLog(`${t.kids.generate.jobCreated} [${jid}]`);

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
        } catch (err) { console.error(err); }
    };

    const downloadGlb = () => {
        if (!glbUrl) return;
        const link = document.createElement("a");
        link.href = glbUrl;
        link.download = `brickers_${jobId || 'model'}.glb`;
        link.click();
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
            const result = await applyColorVariant(ldrUrl, selectedTheme);

            if (result.ok && result.ldrData) {
                const newBlobUrl = base64ToBlobUrl(result.ldrData);
                setLdrUrl(newBlobUrl);
                setIsColorModalOpen(false);
                alert(`${result.themeApplied} 테마 적용 완료! (${result.changedBricks}개 브릭 변경)`);
            } else {
                alert(result.message || "색상 변경 실패");
            }
        } catch (e: any) {
            console.error("색상 변경 실패:", e);
            alert(e.message || "색상 변경 중 오류가 발생했습니다.");
        } finally {
            setIsApplyingColor(false);
        }
    };

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
                        <BrickStackMiniGame percent={percent} />
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

                        <div className="actionBtns">
                            <button className="dlBtn" onClick={downloadLdr}>
                                LDR Download
                            </button>
                            {glbUrl && (
                                <button className="dlBtn" onClick={downloadGlb}>
                                    GLB Download
                                </button>
                            )}
                            <button className="dlBtn colorBtn" onClick={openColorModal}>
                                🎨 색상 변경
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

                {showToast && (
                    <div className="toast">
                        {t.kids.generate.complete}
                    </div>
                )}

                {/* 색상 변경 모달 */}
                {isColorModalOpen && (
                    <div className="colorModalOverlay" onClick={() => setIsColorModalOpen(false)}>
                        <div className="colorModal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="colorModal__title">🎨 색상 테마 선택</h3>

                            <div className="colorModal__themes">
                                {colorThemes.length === 0 ? (
                                    <div className="colorModal__loading">테마 로딩 중...</div>
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
                                    취소
                                </button>
                                <button
                                    className="colorModal__btn colorModal__btn--confirm"
                                    onClick={handleApplyColor}
                                    disabled={!selectedTheme || isApplyingColor}
                                >
                                    {isApplyingColor ? "적용 중..." : "적용하기"}
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

