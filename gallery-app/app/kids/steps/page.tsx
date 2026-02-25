'use client';

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformanceStore } from "@/stores/performanceStore";
import { registerToGallery } from "@/lib/api/myApi";
import * as gtag from "@/lib/gtag";
import LDrawLoadingIndicator from "@/components/common/LDrawLoadingIndicator";
import BackgroundBricks from "@/components/layout/BackgroundBricks";
import ShareModal from "@/components/kids/ShareModal";
import GlbModel from "@/components/three/GlbModel";
import { patchThreeNullChildren } from "@/lib/three/threeUtils";

// Hooks
import useJobData from "@/hooks/useJobData";
import useLdrSteps from "@/hooks/useLdrSteps";
import useColorVariant from "@/hooks/useColorVariant";
import useStepNavigation from "@/hooks/useStepNavigation";

// Components
import OffscreenRenderer, { type ViewName } from "./components/OffscreenRenderer";
import StepSidebar from "./components/StepSidebar";
import ScreenshotGalleryView from "./components/ScreenshotGalleryView";
import AssemblyStepView from "./components/AssemblyStepView";
import BrickListSidebar from "./components/BrickListSidebar";
import ColorChangeModal from "./components/ColorChangeModal";
import GalleryRegisterModal from "./components/GalleryRegisterModal";

import styles from './KidsStepPage.module.css';

patchThreeNullChildren();

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const perfInit = usePerformanceStore((s) => s.init);
    const perfProfile = usePerformanceStore((s) => s.profile);
    const setLoadingPhase = usePerformanceStore((s) => s.setLoadingPhase);

    // Local state
    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB'>('LDR');
    const [isAssemblyMode, setIsAssemblyMode] = useState(false);
    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegisteredToGallery, setIsRegisteredToGallery] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [showFull3D, setShowFull3D] = useState(false);
    const [selectedView, setSelectedView] = useState<ViewName>('front');
    const [loadProgress] = useState({ loaded: 0, total: 0 });

    const modelGroupRef = useRef<THREE.Group | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const jobId = searchParams.get("jobId") || "";
    const urlParam = searchParams.get("url") || "";
    const [originalLdrUrl] = useState<string>(urlParam);
    const isPreset = searchParams.get("isPreset") === "true";

    // === Custom Hooks ===
    useEffect(() => { perfInit(); }, [perfInit]);

    const jobData = useJobData({
        jobId,
        initialLdrUrl: urlParam,
        initialPdfUrl: searchParams.get("pdfUrl") || "",
    });

    const ldrSteps = useLdrSteps({
        ldrUrl: jobData.ldrUrl,
        isAssemblyMode,
        setLoadingPhase,
    });

    const colorVariant = useColorVariant({
        ldrUrl: jobData.ldrUrl,
        originalLdrUrl,
        authFetch,
        t,
        blobRef: ldrSteps.blobRef,
        sortedBlobRef: ldrSteps.sortedBlobRef,
        onStepBlobsUpdated: (blobs, sortedBlob, bricks) => {
            ldrSteps.setStepBlobUrls(blobs);
            ldrSteps.setSortedBlobUrl(sortedBlob);
            ldrSteps.setStepBricks(bricks);
        },
        onBoundsUpdated: ldrSteps.setModelBounds,
        setLoading: ldrSteps.setLoading,
        setStepIdx: ldrSteps.setStepIdx,
    });

    const total = ldrSteps.stepBlobUrls.length || 1;
    const canPrev = ldrSteps.stepIdx > 0;
    const canNext = ldrSteps.stepIdx < total - 1;

    useStepNavigation({
        isAssemblyMode,
        activeTab,
        canNext,
        canPrev,
        setLoading: ldrSteps.setLoading,
        setStepIdx: ldrSteps.setStepIdx,
        containerRef,
    });

    // Auto-switch to assembly mode when no screenshots
    useEffect(() => {
        if (isAssemblyMode) return;
        if (!jobId) { setIsAssemblyMode(true); return; }
        if (jobData.jobLoaded && !jobData.jobScreenshotUrls) {
            setIsAssemblyMode(true);
        }
    }, [jobId, jobData.jobLoaded, jobData.jobScreenshotUrls, isAssemblyMode]);

    // === Handlers ===
    const handleDownloadPdf = () => {
        if (jobData.serverPdfUrl) {
            window.open(jobData.serverPdfUrl, "_blank");
            gtag.trackUserFeedback({ action: "download", job_id: jobId || undefined, label: "PDF_StepPage" });
            gtag.trackFunnel("07_download_pdf", { job_id: jobId || undefined });
        } else {
            alert(t.kids.steps?.pdfWait);
        }
    };

    const handleRegisterGallery = async (inputTitle: string) => {
        if (!inputTitle.trim()) return alert(t.kids.steps.galleryModal.placeholder);
        setIsSubmitting(true);
        try {
            await registerToGallery({
                jobId: jobId || undefined,
                title: inputTitle,
                content: t.kids.steps.galleryModal.content,
                tags: jobData.suggestedTags.length > 0 ? jobData.suggestedTags : ["Kids", "Brick"],
                thumbnailUrl: jobData.previewImageUrl || jobData.jobThumbnailUrl || undefined,
                ldrUrl: jobData.ldrUrl || undefined,
                sourceImageUrl: jobData.jobThumbnailUrl || undefined,
                glbUrl: jobData.glbUrl || undefined,
                parts: jobData.brickCount || undefined,
                screenshotUrls: jobData.jobScreenshotUrls || undefined,
                imageCategory: jobData.imageCategory || undefined,
                backgroundUrl: jobData.shareBackgroundUrl || undefined,
                visibility: "PUBLIC",
            });
            alert(t.kids.steps.galleryModal.success);
            setIsGalleryModalOpen(false);
            setIsRegisteredToGallery(true);
            gtag.trackUserFeedback({ action: "share", job_id: jobId || undefined, label: "Gallery_Register", rating: 5 });
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes("\uC774\uBBF8 \uAC24\uB7EC\uB9AC\uC5D0 \uB4F1\uB85D")) {
                alert(err.message);
                setIsRegisteredToGallery(true);
            } else {
                alert(t.kids.steps.galleryModal.fail);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadLdr = async () => {
        if (!jobData.ldrUrl) return;
        try {
            const res = await fetch(jobData.ldrUrl);
            const blob = await res.blob();
            const dUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dUrl;
            link.download = `brickers_${jobId || 'model'}.ldr`;
            link.click();
            URL.revokeObjectURL(dUrl);
        } catch (err) { console.error(err); }
    };

    const downloadGlb = () => {
        if (!jobData.glbUrl) return;
        const link = document.createElement("a");
        link.href = jobData.glbUrl;
        link.download = `brickers_${jobId || 'model'}.glb`;
        link.click();
    };

    // === Render ===
    return (
        <div ref={containerRef} style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
            <OffscreenRenderer />
            <BackgroundBricks />
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => { gtag.trackExit("share_modal", "modal_close"); setShareModalOpen(false); }}
                backgroundUrl={jobData.shareBackgroundUrl}
                ldrUrl={ldrSteps.sortedBlobUrl || jobData.ldrUrl}
                loading={!jobData.ldrUrl}
            />

            <div className={styles.kidsStep__mainContainer}>
                {!isPreset ? (
                    <StepSidebar
                        t={t}
                        router={router}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isColorModalOpen={colorVariant.isColorModalOpen}
                        setIsColorModalOpen={colorVariant.setIsColorModalOpen}
                        colorChangedLdrBase64={colorVariant.colorChangedLdrBase64}
                        downloadColorChangedLdr={colorVariant.downloadColorChangedLdr}
                        restoreOriginalColor={colorVariant.restoreOriginalColor}
                        isRegisteredToGallery={isRegisteredToGallery}
                        isSubmitting={isSubmitting}
                        handleRegisterGallery={handleRegisterGallery}
                        serverPdfUrl={jobData.serverPdfUrl}
                        loading={ldrSteps.loading}
                        handleDownloadPdf={handleDownloadPdf}
                        ldrUrl={jobData.ldrUrl}
                        downloadLdr={downloadLdr}
                        glbUrl={jobData.glbUrl}
                        downloadGlb={downloadGlb}
                        shareBackgroundUrl={jobData.shareBackgroundUrl}
                        setShareModalOpen={setShareModalOpen}
                    />
                ) : (
                    <div className={styles.kidsStep__sidebarSpacer} />
                )}

                <div className={styles.kidsStep__layoutCenter}>
                    <div className={`${styles.kidsStep__card} kids-main-canvas`}>
                        {ldrSteps.loading && (
                            <LDrawLoadingIndicator loaded={loadProgress.loaded} total={loadProgress.total} label={t.kids.steps.loading} />
                        )}

                        {activeTab === 'LDR' && (
                            <div className={styles.kidsStep__splitContainer}>
                                {!isAssemblyMode && (
                                    <ScreenshotGalleryView
                                        t={t}
                                        showFull3D={showFull3D}
                                        setShowFull3D={setShowFull3D}
                                        jobLoaded={jobData.jobLoaded}
                                        jobScreenshotUrls={jobData.jobScreenshotUrls}
                                        selectedView={selectedView}
                                        setSelectedView={setSelectedView}
                                        perfProfile={perfProfile}
                                        ldrUrl={jobData.ldrUrl}
                                        sortedBlobUrl={ldrSteps.sortedBlobUrl}
                                        modelBounds={ldrSteps.modelBounds}
                                        setLoading={ldrSteps.setLoading}
                                        setIsAssemblyMode={setIsAssemblyMode}
                                    />
                                )}
                                {isAssemblyMode && (
                                    <AssemblyStepView
                                        t={t}
                                        perfProfile={perfProfile}
                                        ldrUrl={jobData.ldrUrl}
                                        sortedBlobUrl={ldrSteps.sortedBlobUrl}
                                        stepIdx={ldrSteps.stepIdx}
                                        setStepIdx={ldrSteps.setStepIdx}
                                        total={total}
                                        canPrev={canPrev}
                                        canNext={canNext}
                                        loading={ldrSteps.loading}
                                        setLoading={ldrSteps.setLoading}
                                        setLoadingPhase={setLoadingPhase}
                                        modelBounds={ldrSteps.modelBounds}
                                        modelGroupRef={modelGroupRef}
                                        setIsAssemblyMode={setIsAssemblyMode}
                                        jobId={jobId}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'GLB' && (
                            <Canvas
                                camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }}
                                dpr={perfProfile?.dpr ?? [1, 2]}
                                frameloop="demand"
                            >
                                <ThrottledDriver />
                                <ambientLight intensity={0.8} />
                                <directionalLight position={[5, 10, 5]} intensity={1.5} />
                                <Environment preset="city" />
                                {jobData.glbUrl && <GlbModel url={jobData.glbUrl} />}
                                <OrbitControls makeDefault enablePan={false} enableZoom enableDamping autoRotate autoRotateSpeed={2} />
                            </Canvas>
                        )}
                        {activeTab === 'GLB' && !jobData.glbUrl && <div className={styles.kidsStep__noModel}>3D Model not available</div>}
                    </div>
                </div>

                {isAssemblyMode && activeTab === 'LDR' ? (
                    <BrickListSidebar t={t} stepIdx={ldrSteps.stepIdx} stepBricks={ldrSteps.stepBricks} />
                ) : (
                    <div className={styles.kidsStep__sidebarSpacer} />
                )}

                <GalleryRegisterModal
                    t={t}
                    isOpen={isGalleryModalOpen}
                    onClose={() => setIsGalleryModalOpen(false)}
                    onRegister={handleRegisterGallery}
                    isSubmitting={isSubmitting}
                />

                <ColorChangeModal
                    t={t}
                    isOpen={colorVariant.isColorModalOpen}
                    onClose={colorVariant.closeColorModal}
                    colorThemes={colorVariant.colorThemes}
                    selectedTheme={colorVariant.selectedTheme}
                    setSelectedTheme={colorVariant.setSelectedTheme}
                    customThemeInput={colorVariant.customThemeInput}
                    setCustomThemeInput={colorVariant.setCustomThemeInput}
                    isApplyingColor={colorVariant.isApplyingColor}
                    handleApplyColor={colorVariant.handleApplyColor}
                    colorPreviewUrl={colorVariant.colorPreviewUrl}
                    sortedBlobUrl={ldrSteps.sortedBlobUrl}
                    ldrUrl={jobData.ldrUrl}
                    perfProfile={perfProfile}
                />
            </div>
        </div>
    );
}

export default function KidsStepPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KidsStepPageContent />
        </Suspense>
    );
}
