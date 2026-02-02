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
import { registerToGallery } from "@/lib/api/myApi"; // Import API
// import './KidsPage.css'; // Removed

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
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [debugLog, setDebugLog] = useState<string>("");
    const [currentStage, setCurrentStage] = useState<string>("QUEUED");

    // 색상 변경 관련
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);

    // 다운로드 드롭다운 상태
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);

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
                        if (alive && statusData.glbUrl) setGlbUrl(statusData.glbUrl);
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
            const result = await applyColorVariant(ldrUrl, selectedTheme, authFetch);

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
    return (
        <div className="relative w-full h-[100dvh] flex flex-col justify-center items-center overflow-hidden">
            <Background3D entryDirection="float" />

            <div className="flex flex-col items-center z-10 w-full max-w-[800px] p-5">
                {status === "loading" && (
                    <>
                        <BrickStackMiniGame percent={percent} />
                    </>
                )}

                {status === "done" && ldrUrl && (
                    <>
                        <div className="font-['KblJumpCondensed',sans-serif] text-[48px] text-black mb-[30px] mt-[60px] text-center">{t.kids.generate.ready}</div>
                        <div className="w-full max-w-[600px] aspect-square bg-white/80 backdrop-blur-[12px] border-[3px] border-black rounded-[24px] mb-[30px] flex flex-col relative">
                            <div className="flex-1 w-full h-full">
                                <KidsLdrPreview key={ldrUrl} url={ldrUrl} />
                            </div>

                            {/* 우측 하단 Next 버튼 */}
                            <button
                                className="absolute bottom-5 right-5 m-0 shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-20 bg-black text-white font-['KblJumpCondensed',sans-serif] text-[20px] px-[40px] py-[10px] rounded-[50px] border-none cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#333] hover:scale-105"
                                onClick={() => {
                                    router.push(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId ?? ""}&age=${age}`);
                                }}
                            >
                                {t.kids.generate.next}
                            </button>
                        </div>

                        {/* 하단 버튼 그룹 */}
                        <div className="flex gap-3 mt-5">
                            {/* 다운로드 드롭다운 */}
                            <div className="relative inline-block">
                                <button
                                    className="bg-white text-black font-['KblJumpCondensed',sans-serif] text-[16px] px-[24px] py-[10px] rounded-[50px] border-2 border-black cursor-pointer transition-all duration-300 ease-in-out font-bold hover:bg-[#eee] hover:scale-105"
                                    onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                                >
                                    Download ▼
                                </button>
                                {isDownloadOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-white border-2 border-black rounded-xl overflow-hidden flex flex-col min-w-[160px] mb-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-[100]">
                                        <button className="px-4 py-3 border-none bg-transparent cursor-pointer text-left font-['KblJumpCondensed',sans-serif] text-[14px] font-bold border-b border-[#eee] transition-colors duration-200 whitespace-nowrap hover:bg-[#f0f0f0]" onClick={downloadLdr}>LDR Download</button>
                                        {glbUrl && <button className="px-4 py-3 border-none bg-transparent cursor-pointer text-left font-['KblJumpCondensed',sans-serif] text-[14px] font-bold border-none transition-colors duration-200 whitespace-nowrap hover:bg-[#f0f0f0]" onClick={downloadGlb}>GLB Download</button>}
                                    </div>
                                )}
                            </div>

                            <button className="hidden bg-white text-black font-['KblJumpCondensed',sans-serif] text-[16px] px-[24px] py-[10px] rounded-[50px] border-2 border-black cursor-pointer transition-all duration-300 ease-in-out font-bold hover:bg-[#eee] hover:scale-105" onClick={openColorModal}>
                                색상 변경
                            </button>
                        </div>
                    </>
                )}

                {status === "error" && (
                    <div className="bg-white/90 p-6 rounded-2xl border-2 border-[#ff4d4f] text-center text-black max-w-[400px]">
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.kids.generate.failed}</div>
                        {t.kids.generate.error}
                        <br />
                        <span style={{ fontSize: "0.8em", color: "#d32f2f" }}>{debugLog}</span>
                    </div>
                )}

                {showToast && (
                    <div className="fixed top-20 right-5 bg-white border-2 border-black text-black px-6 py-4 z-[9999] font-bold text-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg">
                        {t.kids.generate.complete}
                    </div>
                )}

                {/* 색상 변경 모달 */}
                {isColorModalOpen && (
                    <div className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-[6px] flex items-center justify-center" onClick={() => setIsColorModalOpen(false)}>
                        <div className="bg-white w-[min(420px,90vw)] max-h-[80vh] rounded-[24px] p-8 border-[3px] border-black shadow-[0_12px_0_rgba(0,0,0,0.15)] animate-[modalAppear_0.25s_cubic-bezier(0.34,1.56,0.64,1)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-200 text-black z-[100] hover:rotate-90 hover:scale-110" onClick={() => setIsColorModalOpen(false)} aria-label="close">✕</button>
                            <h3 className="m-[0_0_24px] text-[22px] font-[900] text-black text-center">🎨 {t.kids.steps?.colorThemeTitle || "색상 테마 선택"}</h3>

                            <div className="flex flex-col gap-2.5 mb-6 max-h-[300px] overflow-y-auto">
                                {colorThemes.length === 0 ? (
                                    <div className="p-5 text-center text-[#888]">테마 로딩 중...</div>
                                ) : (
                                    colorThemes.map((theme) => (
                                        <button
                                            key={theme.name}
                                            className={`flex flex-col items-start p-[14px_18px] rounded-xl border-2 cursor-pointer transition-all duration-200 ease-in-out text-left ${selectedTheme === theme.name ? "border-black bg-black text-white" : "border-[#e0e0e0] bg-white hover:border-black hover:bg-[#f9f9f9]"}`}
                                            onClick={() => setSelectedTheme(theme.name)}
                                        >
                                            <span className="text-[16px] font-[800] mb-1 capitalize">{theme.name}</span>
                                            <span className={`text-[13px] font-[500] ${selectedTheme === theme.name ? "opacity-85" : "opacity-70"}`}>{theme.description}</span>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    className="flex-1 p-[14px] rounded-xl border-none font-[800] cursor-pointer text-[16px] transition-all duration-200 bg-[#f0f0f0] text-[#555] hover:bg-[#e5e5e5]"
                                    onClick={() => setIsColorModalOpen(false)}
                                >
                                    취소
                                </button>
                                <button
                                    className="flex-[1.5] p-[14px] rounded-xl border-none font-[800] cursor-pointer text-[16px] transition-all duration-200 bg-black text-white hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
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

