'use client';

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./KidsStepPage.module.css";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
const FloatingMenuButton = dynamic(() => import("@/components/kids/FloatingMenuButton"), { ssr: false });

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const url = searchParams.get("url");
    const jobId = searchParams.get("jobId");
    const age = searchParams.get("age") || "4-5";
    const isPreset = searchParams.get("isPreset") === "true";

    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(1);

    useEffect(() => {
        if (!url) {
            router.replace("/");
        }
    }, [url, router]);

    if (!url) {
        return <div className={styles.page}>{t.kids.steps.noUrl}</div>;
    }

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    {t.kids.steps.back}
                </button>
                <div className={styles.stepTitle}>
                    {t.kids.steps.title
                        .replace("{cur}", String(currentStep + 1))
                        .replace("{total}", String(totalSteps))}
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.viewerCard}>
                    <div className={styles.viewer3d}>
                        <KidsLdrPreview url={url} stepMode />
                    </div>
                </div>

                <div className={styles.controls}>
                    <button
                        className={styles.navBtn}
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                    >
                        {t.kids.steps.prev}
                    </button>
                    <button
                        className={styles.navBtn}
                        onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                        disabled={currentStep >= totalSteps - 1}
                    >
                        {t.kids.steps.next}
                    </button>
                </div>

                <div className={styles.actions}>
                    <button className={styles.actionBtn}>
                        {t.kids.steps.downloadGlb}
                    </button>
                    <button className={styles.actionBtn}>
                        {t.kids.steps.downloadLdr}
                    </button>
                    <button className={styles.actionBtnPrimary}>
                        {t.kids.steps.registerGallery}
                    </button>
                </div>
            </div>

            <FloatingMenuButton />
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
