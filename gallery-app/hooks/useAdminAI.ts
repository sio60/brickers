import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAiAnalyticsReport } from "@/lib/api/adminApi";

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

    // [NEW] 기존 리포트 가져오기 (보다 안전한 버전)
    const handleFetchReport = useCallback(async (days: number = 7) => {
        try {
            const data = await getAiAnalyticsReport(days);
            if (data && data.report) {
                setState(prev => ({
                    ...prev,
                    deepReport: data.report,
                    lastDeepAnalysisTime: "Saved Report",
                }));
                return true;
            }
        } catch (e: any) {
            console.error("[useAdminAI] Failed to fetch existing report:", e);
        }
        return false;
    }, []);

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
            const res = await authFetch("/api/admin/analytics/ai/deep-analyze", { method: "POST" });
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

    // 대시보드 진입 시 자동 분석 & 5분 주기 폴링
    const handleDeepAnalyzeRef = useRef(handleDeepAnalyze);
    handleDeepAnalyzeRef.current = handleDeepAnalyze;

    useEffect(() => {
        if (activeTab === "dashboard" && !autoAnalyzeDone && !state.deepAnalyzing) {
            // [REMOVED] 자동 조회 로직 제거 - 분석 시작 버튼으로만 동작하게 함
            setAutoAnalyzeDone(true);
        }

        let interval: NodeJS.Timeout | null = null;
        if (activeTab === "dashboard" && state.deepReport) { // [FIX] 리포트가 있을 때만 주기적 갱신 시작
            interval = setInterval(() => {
                if (!state.deepAnalyzing) {
                    console.log("[AI Analyst] Periodic auto-refreshing...");
                    handleDeepAnalyzeRef.current();
                }
            }, 300000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab, autoAnalyzeDone, state.deepAnalyzing]);

    return {
        ...state,
        handleDeepAnalyze,
        handleRestore
    };
}
