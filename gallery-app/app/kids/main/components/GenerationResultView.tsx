'use client';

import React, { RefObject, useEffect } from 'react';
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import * as gtag from '@/lib/gtag';
import { KidsLdrPreviewHandle } from "@/components/kids/KidsLdrPreview";
import styles from "../KidsPage.module.css";

const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });

interface Props {
    ldrUrl: string;
    jobId: string | null;
    age: string;
    pdfUrl: string | null;
    shareEnabled: boolean;
    shareModalOpen: boolean;
    previewRef: RefObject<KidsLdrPreviewHandle | null>;
    onShareClick: () => void;
}

export const GenerationResultView: React.FC<Props> = ({
    ldrUrl,
    jobId,
    age,
    pdfUrl,
    shareEnabled,
    shareModalOpen,
    previewRef,
    onShareClick
}) => {
    const router = useRouter();
    const { t } = useLanguage();

    // [GA4] 06_view_result 트래킹
    useEffect(() => {
        if (jobId) {
            gtag.trackFunnel("06_view_result", { job_id: jobId, age: age });
        }
    }, [jobId, age]);

    return (
        <div className={styles.resultCard}>
            <div className={styles['viewer-container']}>
                <div className={styles.viewer3d}>
                    <KidsLdrPreview
                        key={ldrUrl}
                        url={ldrUrl}
                        ref={previewRef}
                        autoRotate={!shareModalOpen}
                    />
                </div>
            </div>

            <div className={styles['actionBtns--horizontal']}>
                <button
                    className={`${styles.actionBtn} ${styles['actionBtn--share']}`}
                    disabled={!shareEnabled}
                    style={!shareEnabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    onClick={() => {
                        if (!shareEnabled) return;
                        gtag.trackFunnel("08_share", { job_id: jobId });
                        onShareClick();
                    }}
                >
                    {shareEnabled ? (t.detail?.share || 'Share') : (t.kids?.share?.generatingBg || 'Generating...')}
                </button>

                <button
                    className={`${styles.actionBtn} ${styles['actionBtn--next']}`}
                    onClick={() => {
                        router.push(`/kids/steps?url=${encodeURIComponent(ldrUrl)}&jobId=${jobId ?? ""}&age=${age}${pdfUrl ? `&pdfUrl=${encodeURIComponent(pdfUrl)}` : ""}`);
                    }}
                >
                    {t.kids.generate.next}
                </button>
            </div>
        </div>
    );
};
