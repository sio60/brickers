'use client';

import React from "react";
import styles from "../MyPage.module.css";
import dynamic from "next/dynamic";

const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });

interface JobViewerModalProps {
    t: any;
    selectedJob: any;
    onClose: () => void;
    jobViewStep: 'preview' | 'start';
    setJobViewStep: (v: 'preview' | 'start') => void;
    onStartAssembly: () => void;
}

export default function JobViewerModal({
    t,
    selectedJob,
    onClose,
    jobViewStep,
    setJobViewStep,
    onStartAssembly,
}: JobViewerModalProps) {
    if (!selectedJob) return null;

    return (
        <div className={styles.mypage__modalOverlay}>
            <div className={styles.mypage__modalContent} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', maxWidth: '900px', width: '90%' }}>
                <div className={styles.mypage__previewHead}>
                    <div className={styles.mypage__previewTitle}>
                        {jobViewStep === "preview" ? t.kids.modelSelect.previewTitle : t.kids.steps.startAssembly}
                    </div>
                    <div className={styles.mypage__previewSub}>
                        {jobViewStep === "preview" ? t.kids.modelSelect.previewSub : t.kids.steps.preview}
                    </div>
                    <button className={`${styles.mypage__closeBtn} ${styles.dark}`} style={{ top: '8px', right: '8px' }} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.mypage__previewViewer}>
                    {selectedJob.ldrUrl ? (
                        <KidsLdrPreview url={selectedJob.ldrUrl} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#999]">
                            {t.common.noPreview}
                        </div>
                    )}
                </div>

                <div className={styles.mypage__previewActions}>
                    {jobViewStep === "preview" ? (
                        <button
                            className={styles.mypage__previewNextBtn}
                            onClick={() => setJobViewStep("start")}
                        >
                            {t.kids.steps.startAssembly}
                        </button>
                    ) : (
                        <button
                            className={styles.mypage__previewNextBtn}
                            onClick={onStartAssembly}
                        >
                            {t.jobs.menu.viewBlueprint}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
