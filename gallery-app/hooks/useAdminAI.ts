import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminAIState {
    deepAnalyzing: boolean;
    deepReport: string | null;
    deepRisk: number;
    deepError: string | null;
    deepAnomalies: any[];
    deepActions: any[];
    deepDiagnosis: any;
    moderationResults: any[]; // [NEW] 자율 조치 내역
    lastDeepAnalysisTime: string | null;
}

export function useAdminAI(activeTab: string) {
    const { authFetch } = useAuth();
    const [state, setState] = useState<AdminAIState>({
        deepAnalyzing: false,
        deepReport: null,
        deepRisk: 0,
        deepError: null,
        deepAnomalies: [],
        deepActions: [],
        deepDiagnosis: null,
        moderationResults: [],
        lastDeepAnalysisTime: null,
    });

    const [autoAnalyzeDone, setAutoAnalyzeDone] = useState(false);

    const handleDeepAnalyze = useCallback(async () => {
        setState(prev => ({
            ...prev,
            deepAnalyzing: true,
            deepReport: null,
            deepError: null,
            deepAnomalies: [],
            deepActions: [],
            deepDiagnosis: null,
            moderationResults: []
        }));

        try {
            const res = await authFetch("/api/admin/analytics/deep-analyze", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setState(prev => ({
                    ...prev,
                    deepReport: data.report || data.final_report || "보고서 없음",
                    deepRisk: data.risk_score ?? 0,
                    deepAnomalies: data.anomalies || [],
                    deepActions: data.proposed_actions || [],
                    deepDiagnosis: data.diagnosis || null,
                    moderationResults: data.moderation_results || [],
                    lastDeepAnalysisTime: new Date().toLocaleTimeString(),
                }));
            } else {
                const err = await res.json().catch(() => null);
                setState(prev => ({
                    ...prev,
                    deepError: err?.details || err?.error || `Error ${res.status}`
                }));
            }
        } catch (e: any) {
            setState(prev => ({
                ...prev,
                deepError: e.message || "네트워크 오류"
            }));
        } finally {
            setState(prev => ({ ...prev, deepAnalyzing: false }));
        }
    }, [authFetch]);

    // [NEW] 복구 기능 핸들러
    const handleRestore = useCallback(async (targetType: string, targetId: string) => {
        if (!confirm(`Are you sure you want to restore this ${targetType}?`)) return;

        try {
            const res = await authFetch("/api/admin/moderation/restore", {
                method: "POST",
                body: JSON.stringify({ type: targetType, targetId })
            });
            if (res.ok) {
                alert("Restored successfully!");
                // 로컬 상태에서 조치 상태 업데이트
                setState(prev => ({
                    ...prev,
                    moderationResults: prev.moderationResults.map(r =>
                        r.target_id === targetId ? { ...r, action_taken: 'RESTORED' } : r
                    )
                }));
            } else {
                alert("Failed to restore.");
            }
        } catch (e) {
            console.error(e);
            alert("Error occurred during restore.");
        }
    }, [authFetch]);

    // [NEW] Query Analytics State
    const [queryResult, setQueryResult] = useState<string | null>(null);
    const [isQuerying, setIsQuerying] = useState(false);

    const handleQuerySubmit = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setIsQuerying(true);
        try {
            // Use relative path or env var, consistent with other calls
            const res = await authFetch("/api/admin/analytics/query", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setQueryResult(data.answer);
            } else {
                alert("AI 응답을 받아오지 못했습니다.");
            }
        } catch (error) {
            console.error("Query failed:", error);
            alert("분석 요청 중 오류가 발생했습니다.");
        } finally {
            setIsQuerying(false);
        }
    }, [authFetch]);

    // 대시보드 진입 시 자동 분석 & 5분 주기 폴링
    useEffect(() => {
        if (activeTab === "dashboard" && !autoAnalyzeDone && !state.deepAnalyzing) {
            handleDeepAnalyze();
            setAutoAnalyzeDone(true);
        }

        let interval: NodeJS.Timeout | null = null;
        if (activeTab === "dashboard") {
            interval = setInterval(() => {
                if (!state.deepAnalyzing) {
                    console.log("[AI Analyst] Periodic auto-refreshing...");
                    handleDeepAnalyze();
                }
            }, 300000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab, autoAnalyzeDone, state.deepAnalyzing, handleDeepAnalyze]);

    return {
        ...state,
        queryResult,   // [NEW]
        isQuerying,    // [NEW]
        handleDeepAnalyze,
        handleRestore,
        handleQuerySubmit // [NEW]
    };
}
