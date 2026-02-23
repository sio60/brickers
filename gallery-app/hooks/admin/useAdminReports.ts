"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Report } from "@/components/admin/ReportsTab";

const createdAtTime = (createdAt?: string) => {
    if (!createdAt) return 0;
    const time = new Date(createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const sortReportsByPendingAnswer = (items: Report[]) => {
    return [...items].sort((a, b) => {
        const aPending = a.status === "PENDING" || !a.resolutionNote?.trim();
        const bPending = b.status === "PENDING" || !b.resolutionNote?.trim();
        if (aPending !== bPending) return aPending ? -1 : 1;
        return createdAtTime(a.createdAt) - createdAtTime(b.createdAt);
    });
};

export function useAdminReports() {
    const { authFetch } = useAuth();

    const [reports, setReports] = useState<Report[]>([]);
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

    const fetchReports = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/reports?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setReports(sortReportsByPendingAnswer(data.content || []));
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleReportResolve = async (reportId: string, approve: boolean) => {
        const note = answerTexts[reportId];
        if (!note?.trim()) return;
        try {
            const res = await authFetch(`/api/admin/reports/${reportId}/resolve`, {
                method: "POST",
                body: JSON.stringify({ action: approve ? "APPROVE" : "REJECT", note })
            });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [reportId]: "" }));
                fetchReports();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        reports,
        answerTexts,
        setAnswerTexts,
        handleReportResolve,
    };
}
