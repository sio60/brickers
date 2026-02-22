'use client';

import React, { RefObject, useEffect } from 'react';
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import * as gtag from '@/lib/gtag';
import { KidsLdrPreviewHandle } from "@/components/kids/KidsLdrPreview";

const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });

interface Props {
    ldrUrl: string;
    jobId: string | null;
    age: string;
    pdfUrl: string | null;
    shareModalOpen: boolean;
    previewRef: RefObject<KidsLdrPreviewHandle | null>;
    onShareClick: () => void;
}

export const GenerationResultView: React.FC<Props> = ({
    ldrUrl,
    jobId,
    age,
    pdfUrl,
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
        <div className="resultCard">
            <div className="viewer-container">
                <div className="viewer3d">
                    <KidsLdrPreview
                        key={ldrUrl}
                        url={ldrUrl}
                        ref={previewRef}
                        autoRotate={!shareModalOpen}
                    />
                </div>
            </div>

            <div className="actionBtns--horizontal">
                <button
                    className="actionBtn actionBtn--share"
                    onClick={() => {
                        gtag.trackFunnel("08_share", { job_id: jobId });
                        onShareClick();
                    }}
                >
                    {t.detail?.share || 'Share'}
                </button>

                <button
                    className="actionBtn actionBtn--next"
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
