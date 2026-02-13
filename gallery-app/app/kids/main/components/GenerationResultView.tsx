'use client';

import React, { RefObject } from 'react';
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
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
                    onClick={onShareClick}
                >
                    공유하기
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
