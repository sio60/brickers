'use client';

import { useState } from "react";
import styles from '../KidsStepPage.module.css';

interface GalleryRegisterInputProps {
    t: any;
    isRegisteredToGallery: boolean;
    isSubmitting: boolean;
    onRegister: (title: string) => void;
}

function GalleryRegisterInput({ t, isRegisteredToGallery, isSubmitting, onRegister }: GalleryRegisterInputProps) {
    const [title, setTitle] = useState("");

    const handleClick = () => {
        onRegister(title);
    };

    return (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
            <div style={{ marginBottom: 8, paddingLeft: 2, fontSize: "0.65rem", color: "#999", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                {t.kids.steps.registerGallery}
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                <input
                    type="text" className={styles.kidsStep__sidebarInput}
                    placeholder={t.kids.steps.galleryModal.placeholder}
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    disabled={isRegisteredToGallery}
                />
                <button
                    className={styles.kidsStep__sidebarBtn} onClick={handleClick}
                    disabled={isSubmitting || isRegisteredToGallery}
                >
                    {isRegisteredToGallery ? `\u2713 ${t.kids.steps?.registered || '\uB4F1\uB85D\uC644\uB8CC'}` : (isSubmitting ? "..." : t.kids.steps.registerGallery)}
                </button>
            </div>
        </div>
    );
}

interface StepSidebarProps {
    t: any;
    router: ReturnType<typeof import('next/navigation').useRouter>;
    activeTab: 'LDR' | 'GLB';
    setActiveTab: (tab: 'LDR' | 'GLB') => void;
    isColorModalOpen: boolean;
    setIsColorModalOpen: (v: boolean) => void;
    colorChangedLdrBase64: string | null;
    downloadColorChangedLdr: () => void;
    restoreOriginalColor: () => void;
    isRegisteredToGallery: boolean;
    isSubmitting: boolean;
    handleRegisterGallery: (title: string) => void;
    serverPdfUrl: string;
    loading: boolean;
    handleDownloadPdf: () => void;
    ldrUrl: string;
    downloadLdr: () => void;
    glbUrl: string | null;
    downloadGlb: () => void;
    shareBackgroundUrl: string | null;
    setShareModalOpen: (v: boolean) => void;
}

export default function StepSidebar({
    t,
    router,
    activeTab,
    setActiveTab,
    isColorModalOpen,
    setIsColorModalOpen,
    colorChangedLdrBase64,
    downloadColorChangedLdr,
    restoreOriginalColor,
    isRegisteredToGallery,
    isSubmitting,
    handleRegisterGallery,
    serverPdfUrl,
    loading,
    handleDownloadPdf,
    ldrUrl,
    downloadLdr,
    glbUrl,
    downloadGlb,
    shareBackgroundUrl,
    setShareModalOpen,
}: StepSidebarProps) {
    return (
        <div className={styles.kidsStep__sidebar}>
            <button onClick={() => router.back()} className={styles.kidsStep__backBtn}>
                ← {t.kids.steps.back}
            </button>



            <div className={styles.kidsStep__sidebarSectionLabel}>
                {t.kids.steps.viewModes}
            </div>

            <div className={styles.kidsStep__modeContainer}>
                <button onClick={() => setActiveTab('LDR')} className={`${styles.kidsStep__modeBtn} ${activeTab === 'LDR' ? styles.active : ''}`}>
                    {t.kids.steps.tabBrick}
                </button>
                <button onClick={() => setActiveTab('GLB')} className={`${styles.kidsStep__modeBtn} ${activeTab === 'GLB' ? styles.active : ''}`}>
                    {t.kids.steps.tabModeling}
                </button>
            </div>

            <div className={styles.kidsStep__colorContainer}>
                <button onClick={() => setIsColorModalOpen(true)} className={styles.kidsStep__colorBtn}>
                    {t.kids.steps?.changeColor || '\uC0C9\uC0C1 \uBCC0\uACBD'}
                </button>
                {colorChangedLdrBase64 && (
                    <>
                        <button onClick={downloadColorChangedLdr} className={styles.kidsStep__downloadColorBtn}>
                            ⬇ {t.kids.steps.downloadLdr}
                        </button>
                        <button onClick={restoreOriginalColor} className={styles.kidsStep__restoreBtn}>
                            ↺ {t.kids.steps?.restoreOriginal || '원본 복원'}
                        </button>
                    </>
                )}
            </div>

            <GalleryRegisterInput
                t={t}
                isRegisteredToGallery={isRegisteredToGallery}
                isSubmitting={isSubmitting}
                onRegister={handleRegisterGallery}
            />

            <div className={styles.kidsStep__sidebarSection}>
                <div className={styles.kidsStep__sidebarSectionLabel}>
                    PDF Download
                </div>
                <button
                    className={styles.kidsStep__sidebarBtn} onClick={handleDownloadPdf}
                    disabled={!serverPdfUrl || loading}
                >
                    {serverPdfUrl ? t.kids.steps?.pdfDownloadBtn : t.kids.steps?.pdfPreparing}
                </button>
            </div>

            <div className={styles.kidsStep__sidebarSection}>
                <div className={styles.kidsStep__sidebarSectionLabel}>
                    File Download
                </div>
                <button
                    className={styles.kidsStep__sidebarBtn}
                    onClick={downloadLdr}
                    disabled={!ldrUrl || loading}
                >
                    LDR DOWNLOAD
                </button>
                <button
                    className={styles.kidsStep__sidebarBtn}
                    style={{ marginTop: 8 }}
                    onClick={downloadGlb}
                    disabled={!glbUrl || loading}
                >
                    GLB DOWNLOAD
                </button>
            </div>
            <div className={styles.kidsStep__sidebarSection}>
                <div className={styles.kidsStep__sidebarSectionLabel}>
                    이동하기
                </div>
                <button className={styles.kidsStep__sidebarBtn} style={{ marginTop: 8 }} onClick={() => router.push("/")}>
                    홈으로
                </button>
                <button className={styles.kidsStep__sidebarBtn} style={{ marginTop: 8 }} onClick={() => router.push("/gallery")}>
                    갤러리 보기
                </button>

                {/* 공유하기 버튼 추가 */}
                <button
                    className={styles.kidsStep__sidebarBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => setShareModalOpen(true)}
                >
                    공유하기
                </button>
            </div>
        </div>
    );
}
