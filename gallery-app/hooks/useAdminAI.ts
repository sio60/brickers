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
            deepDiagnosis: null
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
        handleDeepAnalyze
    };
}
