'use client';

import { useState, useEffect } from 'react';

interface UseJobDataParams {
    jobId: string;
    initialLdrUrl: string;
    initialPdfUrl?: string;
}

interface UseJobDataReturn {
    ldrUrl: string;
    setLdrUrl: (v: string) => void;
    glbUrl: string | null;
    jobThumbnailUrl: string | null;
    suggestedTags: string[];
    brickCount: number;
    isProMode: boolean;
    serverPdfUrl: string;
    setServerPdfUrl: (v: string) => void;
    jobScreenshotUrls: Record<string, string> | null;
    shareBackgroundUrl: string | null;
    imageCategory: string | null;
    previewImageUrl: string | null;
    jobLoaded: boolean;
}

/**
 * Job data fetching hook extracted from kids/steps/page.tsx.
 * Fetches job metadata and populates all job-related state.
 */
export default function useJobData({
    jobId,
    initialLdrUrl,
    initialPdfUrl,
}: UseJobDataParams): UseJobDataReturn {
    const [ldrUrl, setLdrUrl] = useState<string>(initialLdrUrl);
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [brickCount, setBrickCount] = useState<number>(0);
    const [isProMode, setIsProMode] = useState(false);
    const [serverPdfUrl, setServerPdfUrl] = useState<string>(initialPdfUrl || '');
    const [jobScreenshotUrls, setJobScreenshotUrls] = useState<Record<string, string> | null>(null);
    const [shareBackgroundUrl, setShareBackgroundUrl] = useState<string | null>(null);
    const [imageCategory, setImageCategory] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [jobLoaded, setJobLoaded] = useState(false);

    // Job data fetch
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!jobId) return;
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
                const res = await fetch(`${API_BASE}/api/kids/jobs/${jobId}`, { credentials: 'include' });
                if (!res.ok) throw new Error(`job fetch failed: ${res.status}`);
                const data = await res.json();
                if (alive) {
                    if (!ldrUrl) setLdrUrl(data.ldrUrl || data.ldr_url || '');
                    setJobThumbnailUrl(data.sourceImageUrl || null);
                    setGlbUrl(data.glbUrl || data.glb_url || null);
                    if (data.suggestedTags && Array.isArray(data.suggestedTags)) setSuggestedTags(data.suggestedTags);
                    if (data.parts) setBrickCount(data.parts);
                    if (data.isPro) setIsProMode(true);
                    if (data.pdfUrl || data.pdf_url) setServerPdfUrl(data.pdfUrl || data.pdf_url);
                    if (data.screenshotUrls) setJobScreenshotUrls(data.screenshotUrls);
                    if (data.backgroundUrl) setShareBackgroundUrl(data.backgroundUrl);
                    if (data.imageCategory) setImageCategory(data.imageCategory);
                    if (data.previewImageUrl) setPreviewImageUrl(data.previewImageUrl);
                    setJobLoaded(true);
                }
            } catch (e) {
                console.error(e);
                if (alive) setJobLoaded(true);
            }
        })();
        return () => { alive = false; };
    }, [jobId, ldrUrl]);

    // Background/screenshot callbacks can arrive after the first job fetch completes.
    useEffect(() => {
        if (!jobId || !jobLoaded || shareBackgroundUrl) return;

        let alive = true;
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const MAX_ATTEMPTS = 60; // ~2 minutes

        (async () => {
            for (let i = 0; i < MAX_ATTEMPTS && alive; i++) {
                await sleep(2000);
                if (!alive) return;

                try {
                    const res = await fetch(`${API_BASE}/api/kids/jobs/${jobId}`, { credentials: 'include' });
                    if (!res.ok) continue;
                    const data = await res.json();
                    if (!alive) return;

                    if (data.screenshotUrls) setJobScreenshotUrls(data.screenshotUrls);
                    if (data.backgroundUrl) {
                        setShareBackgroundUrl(data.backgroundUrl);
                        return;
                    }
                } catch {
                    // ignore transient polling errors
                }
            }
        })();

        return () => { alive = false; };
    }, [jobId, jobLoaded, shareBackgroundUrl]);

    return {
        ldrUrl,
        setLdrUrl,
        glbUrl,
        jobThumbnailUrl,
        suggestedTags,
        brickCount,
        isProMode,
        serverPdfUrl,
        setServerPdfUrl,
        jobScreenshotUrls,
        shareBackgroundUrl,
        imageCategory,
        previewImageUrl,
        jobLoaded,
    };
}
