'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, ThemeInfo } from "@/lib/api/colorVariantApi";
import { KidsLdrPreviewHandle } from "@/components/kids/KidsLdrPreview";

import { usePerformanceStore } from "@/stores/performanceStore";
import { useBrickGeneration } from "@/hooks/useBrickGeneration";

// Sub-components
import { GenerationLoadingView } from "./components/GenerationLoadingView";
import { GenerationResultView } from "./components/GenerationResultView";
import ShareModal from "@/components/kids/ShareModal";
import styles from "./KidsPage.module.css";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

function KidsPageContent() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();
    const searchParams = useSearchParams();
    const perfInit = usePerformanceStore((s) => s.init);

    useEffect(() => { perfInit(); }, [perfInit]);

    // 1. Initial State & Params
    const age = (searchParams.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10" | "PRO";
    const budget = useMemo(() => {
        if (age === "4-5") return 400;
        if (age === "6-7") return 800;
        if (age === "8-10") return 1200;
        if (age === "PRO") return 5000;
        return 1200;
    }, [age]);

    const [rawFile, setRawFile] = useState<File | null>(null);
    const [targetPrompt, setTargetPrompt] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<"image" | "drawing" | "prompt" | null>(null);
    const [isFileLoaded, setIsFileLoaded] = useState(false);

    // Initial load logic
    useEffect(() => {
        const storedUpload = sessionStorage.getItem('pendingUpload');
        const storedPrompt = sessionStorage.getItem('pendingPrompt');

        if (storedUpload) {
            try {
                const { name, type, dataUrl, sourceType: storedSourceType } = JSON.parse(storedUpload);
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        setRawFile(new File([blob], name, { type }));
                        setSourceType(storedSourceType === "drawing" ? "drawing" : "image");
                        setIsFileLoaded(true);
                        sessionStorage.removeItem('pendingUpload');
                    })
                    .catch(e => {
                        console.error('Failed to restore file from session:', e);
                        setIsFileLoaded(true);
                    });
            } catch (e) {
                console.error('Failed to restore file:', e);
                setIsFileLoaded(true);
            }
        } else if (storedPrompt || searchParams.get("prompt")) {
            setTargetPrompt(storedPrompt || searchParams.get("prompt"));
            setSourceType("prompt");
            setIsFileLoaded(true);
            sessionStorage.removeItem('pendingPrompt');
        } else {
            setIsFileLoaded(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isFileLoaded && !rawFile && !targetPrompt) {
            router.replace("/");
        }
    }, [rawFile, targetPrompt, isFileLoaded, router]);

    // 2. Business Logic Hooks
    const generation = useBrickGeneration({ rawFile, targetPrompt, age, budget, sourceType });

    const previewRef = useRef<KidsLdrPreviewHandle>(null);

    // 3. UI State
    const [shareModalOpen, setShareModalOpen] = useState(false);

    // Color management
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);

    // 4. Handlers
    const handleShareImage = () => {
        if (!generation.shareBackgroundUrl || !generation.ldrUrl) return;
        setShareModalOpen(true);
    };

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

    const handleApplyColor = async () => {
        if (!selectedTheme || !generation.ldrUrl || !generation.setLdrUrl) return;
        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(generation.ldrUrl, selectedTheme, authFetch);
            if (result.ok && result.ldrData) {
                const prevUrl = generation.ldrUrl;
                generation.setLdrUrl(base64ToBlobUrl(result.ldrData));
                if (prevUrl?.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
                setIsColorModalOpen(false);
                alert(`${result.themeApplied} ${t.kids.steps.colorThemeApplied} (${result.changedBricks} bricks)`);
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

    if (!isFileLoaded) return <div className={styles.page}>Loading...</div>;

    return (
        <div className={styles.page}>
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                backgroundUrl={generation.shareBackgroundUrl}
                ldrUrl={generation.ldrUrl || ""}
                loading={!generation.shareBackgroundUrl || !generation.ldrUrl}
            />

            <Background3D entryDirection="float" />

            <div className={styles.center}>
                {generation.status === "loading" && (
                    <GenerationLoadingView
                        percent={generation.progressPercent}
                        jobId={generation.jobId ?? undefined}
                        age={age}
                        agentLogs={generation.agentLogs}
                    />
                )}

                {generation.status === "done" && generation.ldrUrl && (
                    <GenerationResultView
                        ldrUrl={generation.ldrUrl}
                        jobId={generation.jobId}
                        age={age}
                        pdfUrl={generation.pdfUrl}
                        shareModalOpen={shareModalOpen}
                        previewRef={previewRef}
                        onShareClick={handleShareImage}
                    />
                )}

                {generation.status === "error" && (
                    <div className={styles.error}>
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.kids.generate.failed}</div>
                        {t.kids.generate.error}
                        <br />
                        <span style={{ fontSize: "0.8em", color: "#d32f2f" }}>{generation.debugLog}</span>
                    </div>
                )}

                {/* 색상 변경 모달 (Modularize later if needed) */}
                {isColorModalOpen && (
                    <div className={styles.colorModalOverlay} onClick={() => setIsColorModalOpen(false)}>
                        <div className={styles.colorModal} onClick={(e) => e.stopPropagation()}>
                            <button className={styles.modalCloseBtn} onClick={() => setIsColorModalOpen(false)} aria-label="close">✕</button>
                            <h3 className={styles.colorModal__title}>{t.kids.steps?.colorThemeTitle || "색상 테마 선택"}</h3>
                            <div className={styles.colorModal__themes}>
                                {colorThemes.length === 0 ? (
                                    <div className={styles.colorModal__loading}>{t.common?.loading || "테마 로딩 중..."}</div>
                                ) : (
                                    colorThemes.map((theme) => (
                                        <button
                                            key={theme.name}
                                            className={`${styles.colorModal__themeBtn} ${selectedTheme === theme.name ? styles['colorModal__themeBtn--selected'] : ""}`}
                                            onClick={() => setSelectedTheme(theme.name)}
                                        >
                                            <span className={styles.colorModal__themeName}>{theme.name}</span>
                                            <span className={styles.colorModal__themeDesc}>{theme.description}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className={styles.colorModal__actions}>
                                <button className={`${styles.colorModal__btn} ${styles['colorModal__btn--cancel']}`} onClick={() => setIsColorModalOpen(false)}>{t.common.cancel}</button>
                                <button className={`${styles.colorModal__btn} ${styles['colorModal__btn--confirm']}`} onClick={handleApplyColor} disabled={!selectedTheme || isApplyingColor}>
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
