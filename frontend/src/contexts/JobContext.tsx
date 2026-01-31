import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "./ToastContext";
import { useLanguage } from "./LanguageContext";

type JobState = {
    jobId: string;
    status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
    stage: string;
    ldrUrl?: string;
    error?: string;
    percent: number;
};

type JobContextType = {
    jobs: Record<string, JobState>;
    startJob: (jobId: string) => void;
    removeJob: (jobId: string) => void;
    findJob: (jobId: string) => JobState | undefined;
};

const JobContext = createContext<JobContextType | null>(null);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [jobs, setJobs] = useState<Record<string, JobState>>({});
    const { showToast } = useToast();
    const { t } = useLanguage();
    const location = useLocation();
    const locationRef = useRef(location.pathname);

    useEffect(() => {
        locationRef.current = location.pathname;
    }, [location.pathname]);

    // Track active individual pollers to avoid duplicates
    const activePollers = useRef<Set<string>>(new Set());

    const pollJob = useCallback(async (jobId: string) => {
        if (activePollers.current.has(jobId)) return;
        activePollers.current.add(jobId);

        const POLL_INTERVAL = 4000;

        const interval = window.setInterval(async () => {
            try {
                const res = await fetch(`/api/kids/jobs/${jobId}`);
                if (!res.ok) return;

                const data = await res.json();
                const status = data.status;
                const stage = data.stage || status || "QUEUED";

                const stageProgress: Record<string, number> = {
                    "QUEUED": 15,
                    "RUNNING": 25,
                    "THREE_D_PREVIEW": 50,
                    "MODEL": 80,
                    "BLUEPRINT": 90,
                    "DONE": 100,
                };

                const percent = stageProgress[stage] || 15;

                setJobs(prev => ({
                    ...prev,
                    [jobId]: {
                        ...prev[jobId],
                        status,
                        stage,
                        percent,
                        ldrUrl: data.ldrUrl,
                        error: data.errorMessage
                    }
                }));

                if (status === "DONE" || status === "FAILED") {
                    window.clearInterval(interval);
                    activePollers.current.delete(jobId);

                    if (status === "DONE" && locationRef.current !== "/kids/main") {
                        showToast(t.kids.generate.ready, t.kids.generate.complete);
                    }
                }
            } catch (e) {
                console.error(`Polling error for ${jobId}:`, e);
            }
        }, POLL_INTERVAL);
    }, [showToast, t]);

    const startJob = useCallback((jobId: string) => {
        setJobs(prev => ({
            ...prev,
            [jobId]: { jobId, status: "QUEUED", stage: "QUEUED", percent: 15 }
        }));
        pollJob(jobId);
    }, [pollJob]);

    const removeJob = useCallback((jobId: string) => {
        setJobs(prev => {
            const next = { ...prev };
            delete next[jobId];
            return next;
        });
        activePollers.current.delete(jobId);
    }, []);

    const findJob = useCallback((jobId: string) => {
        return jobs[jobId];
    }, [jobs]);

    return (
        <JobContext.Provider value={{ jobs, startJob, removeJob, findJob }}>
            {children}
        </JobContext.Provider>
    );
};

export const useJob = () => {
    const ctx = useContext(JobContext);
    if (!ctx) throw new Error("useJob must be used within JobProvider");
    return ctx;
};
