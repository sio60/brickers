'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPresignUrl } from '@/lib/api/myApi';
import { useJobStore } from '@/stores/jobStore';
import * as gtag from '@/lib/gtag';

export type GenerationStatus = 'idle' | 'loading' | 'done' | 'error';

interface GenerationParams {
    rawFile: File | null;
    targetPrompt: string | null;
    age: '4-5' | '6-7' | '8-10' | 'PRO';
    budget: number;
}

export function useBrickGeneration({ rawFile, targetPrompt, age, budget }: GenerationParams) {
    const { t, language } = useLanguage();
    const { authFetch } = useAuth();

    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [currentStage, setCurrentStage] = useState<string>('QUEUED');
    const [agentLogs, setAgentLogs] = useState<string[]>([]);
    const [debugLog, setDebugLog] = useState<string>('');

    // Result data
    const [ldrUrl, setLdrUrl] = useState<string | null>(null);
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [shareBackgroundUrl, setShareBackgroundUrl] = useState<string | null>(null);
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [brickCount, setBrickCount] = useState<number>(0);
    const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string> | null>(null);
    const [jobTitle, setJobTitle] = useState<string>('');

    const processingRef = useRef(false);
    const authFetchRef = useRef(authFetch);
    const tRef = useRef(t);
    useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);
    useEffect(() => { tRef.current = t; }, [t]);

    useEffect(() => {
        const promptText = (targetPrompt ?? "").trim();
        if (!rawFile && !promptText) return;
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
            const startTime = Date.now();
            let jid: string | undefined;
            let latestCategory = "";

            await sleep(200);
            setDebugLog(tRef.current.kids.generate.starting);

            gtag.trackGeneration("start", {
                job_id: "pending",
                age: age,
                label: targetPrompt ? 'prompt' : 'image',
                budget: budget,
                search_term: targetPrompt || undefined
            });

            try {
                let sourceImageUrl = "";
                let fileTitle = "prompt_gen";

                if (rawFile) {
                    setDebugLog(tRef.current.kids.generate.uploadPrepare);
                    const presign = await getPresignUrl(rawFile.type, rawFile.name);
                    if (alive) setJobThumbnailUrl(presign.publicUrl);

                    setDebugLog(tRef.current.kids.generate.uploading);
                    const uploadRes = await fetch(presign.uploadUrl, {
                        method: "PUT",
                        body: rawFile,
                        headers: { "Content-Type": rawFile.type },
                        signal: abort.signal,
                    });

                    if (!uploadRes.ok) throw new Error(`S3 Upload Error: ${uploadRes.status}`);
                    sourceImageUrl = presign.publicUrl;
                    fileTitle = rawFile.name.replace(/\.[^/.]+$/, "");
                } else if (promptText) {
                    fileTitle = promptText.substring(0, 10);
                }

                setDebugLog(tRef.current.kids.generate.creating2);
                const payload = {
                    sourceImageUrl: sourceImageUrl || undefined,
                    prompt: promptText || undefined,
                    age,
                    budget,
                    title: fileTitle,
                    language,
                };

                const startRes = await authFetchRef.current('/api/kids/generate', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: abort.signal,
                });

                if (!startRes.ok) {
                    const errText = await startRes.text();
                    throw new Error(`Start Error: ${errText}`);
                }

                const startData = await startRes.json();
                jid = startData.jobId;
                if (!jid) throw new Error("No jobId received");

                if (!alive) return;
                setJobId(jid);
                setDebugLog(`${tRef.current.kids.generate.jobCreated} [${jid}]`);

                useJobStore.getState().setActiveJob({ jobId: jid, status: 'QUEUED', age });

                // [NEW] Track user search keyword if targetPrompt exists
                if (targetPrompt) {
                    gtag.trackUserFeedback({
                        action: "search",
                        search_term: targetPrompt,
                        job_id: jid
                    });
                }

                let finalData: any = null;
                for (let i = 0; i < maxAttempts; i++) {
                    if (!alive) return;
                    await sleep(POLL_INTERVAL);

                    const statusRes = await authFetchRef.current(`/api/kids/jobs/${jid}`, {
                        signal: abort.signal,
                    });

                    if (!statusRes.ok) {
                        setDebugLog(`${tRef.current.kids.generate.serverDelay} (${statusRes.status})`);
                        continue;
                    }

                    const statusData = await statusRes.json();
                    const stage = statusData.stage || statusData.status || "QUEUED";
                    setCurrentStage(stage);

                    // [NEW] Capture latest category for fail/success tracking
                    if (statusData.imageCategory) {
                        latestCategory = statusData.imageCategory;
                    }

                    let warningMsg = "";
                    if (statusData.status === "RUNNING" && statusData.stageUpdatedAt) {
                        const stageUpdatedTime = new Date(statusData.stageUpdatedAt).getTime();
                        const now = Date.now();
                        const minutesSinceUpdate = Math.floor((now - stageUpdatedTime) / 60000);
                        if (minutesSinceUpdate > 10) warningMsg = ` ⚠️ AI 응답 없음 (${minutesSinceUpdate}m)`;
                    }

                    setDebugLog(`${tRef.current.kids.generate.inProgress} [${stage}] (${i}/${maxAttempts})${warningMsg}`);

                    if (statusData.status === "FAILED") {
                        useJobStore.getState().setActiveJob({ jobId: jid, status: 'FAILED', age });
                        throw new Error(statusData.errorMessage || "Generation failed");
                    }

                    if (statusData.status === "DONE") {
                        finalData = statusData;
                        if (alive && statusData.glbUrl) setGlbUrl(statusData.glbUrl);
                        if (statusData.suggestedTags) setSuggestedTags(statusData.suggestedTags);
                        if (statusData.parts) setBrickCount(statusData.parts);
                        if (statusData.screenshotUrls) setScreenshotUrls(statusData.screenshotUrls);
                        if (statusData.title) setJobTitle(statusData.title);

                        useJobStore.getState().setShowDoneToast(true);
                        useJobStore.getState().setActiveJob({
                            jobId: jid,
                            status: 'DONE',
                            ldrUrl: statusData.ldrUrl,
                            glbUrl: statusData.glbUrl,
                            age
                        });

                        const waitTime = Math.round((Date.now() - startTime) / 1000);

                        // [GA4] Success Tracking
                        gtag.trackGeneration("success", {
                            job_id: jid,
                            age: age,
                            wait_time: waitTime,
                            brick_count: statusData.parts || 0,
                            suggested_tags: statusData.suggestedTags?.join(', '),
                            lmm_latency: statusData.lmmLatency,
                            image_category: latestCategory || statusData.imageCategory,
                            est_cost: statusData.estCost, // [New] Cost Tracking
                            token_count: statusData.tokenCount, // [New] Token Tracking
                            stability_score: statusData.stabilityScore // [New] Stability Score
                        });

                        // [NEW] Track Search Term Fallback (If no user prompt, use identified tags/subject)
                        if (!targetPrompt) {
                            const fallbackTerm = statusData.title || (statusData.suggestedTags && statusData.suggestedTags[0]) || "Untitled";
                            gtag.trackUserFeedback({
                                action: "search",
                                search_term: fallbackTerm,
                                job_id: jid
                            });
                        }

                        break;
                    }
                }

                if (!finalData) throw new Error(`Timeout: exceeded ${FRONT_TIMEOUT_SEC}s`);

                const modelUrl = finalData.ldrUrl || finalData.modelKey;
                setDebugLog(tRef.current.kids.generate.loadingResult);

                if (!modelUrl) throw new Error("No model URL in job result");

                if (!alive) return;

                setLdrUrl(modelUrl);
                setGlbUrl(finalData.glbUrl || finalData.glb_url);
                if (finalData.backgroundUrl) setShareBackgroundUrl(finalData.backgroundUrl);
                if (finalData.pdfUrl) setPdfUrl(finalData.pdfUrl);
                setStatus("done");
            } catch (e) {
                if (!alive) return;
                console.error("[useBrickGeneration] Error:", e);
                setStatus("error");

                // [GA4] Fail Tracking (Include category if identified)
                gtag.trackGeneration("fail", {
                    job_id: jid || "unknown",
                    error_type: e instanceof Error ? e.name : "UnknownError",
                    message: e instanceof Error ? e.message : String(e),
                    image_category: latestCategory || undefined // [NEW]
                });
            }
        };

        runProcess();

        return () => {
            alive = false;
            try { abort.abort(); } catch { }
            const currentJob = useJobStore.getState().activeJob;
            if (currentJob && currentJob.status !== 'DONE' && currentJob.status !== 'FAILED') {
                useJobStore.getState().startPolling(currentJob.jobId, currentJob.age);
            }
        };
    }, [rawFile, targetPrompt, age, budget]);

    // SSE Logs
    useEffect(() => {
        if (!jobId || status !== "loading") return;

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const sseUrl = `${apiBase}/api/kids/jobs/${encodeURIComponent(jobId)}/logs/stream`;
        const es = new EventSource(sseUrl);
        let errorCount = 0;

        es.addEventListener("agent-log", (e) => {
            errorCount = 0;
            setAgentLogs(prev => {
                const next = [...prev, e.data];
                return next.length > 50 ? next.slice(-50) : next;
            });
        });

        es.onerror = () => {
            errorCount++;
            if (errorCount >= 5) es.close();
        };

        return () => es.close();
    }, [jobId, status]);

    const progressPercent = useMemo(() => {
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

    return {
        status,
        jobId,
        progressPercent,
        agentLogs,
        debugLog,
        ldrUrl,
        glbUrl,
        pdfUrl,
        jobThumbnailUrl,
        shareBackgroundUrl,
        suggestedTags,
        brickCount,
        screenshotUrls,
        jobTitle,
        setLdrUrl, // For color updates
    };
}
