'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ── 타입 정의 ──────────────────────────────────────────
interface DailyUser { date: string; count: number; }
interface DailyTrend { date: string; count: number; }
interface TagStat { tag: string; count: number; }
interface HeavyUser { userId: string; eventCount: number; }
interface PerformanceData {
    failureStats: { reason: string; count: number; }[];
    performance: { avgWaitTime: number; avgCost: number; avgBrickCount: number; };
}
interface DeepInsightData {
    categoryStats: { category: string; successCount: number; failCount: number; }[];
    qualityStats: any[];
}

export interface ProductIntelligenceResponse {
    funnel: Array<{ stage: string; count: number }>;
    quality: {
        avgStability: number;
        avgBrickCount: number;
        avgLatency: number;
        totalCost: number;
    };
    exits: Array<{ step: string; count: number }>;
}

// New types introduced by the diff for AdminDetailContextType
interface DailyUserData { date: string; count: number; }
interface GenerationTrendData { date: string; count: number; }

interface AdminDetailContextType {
    dailyUsers: DailyUserData[] | null;
    genTrend: GenerationTrendData[] | null;
    performance: PerformanceData | null;
    topTags: Array<{ tag: string; count: number }> | null;
    heavyUsers: Array<{ userId: string; email: string; generationCount: number }> | null;
    deepInsight: DeepInsightData | null;
    productIntelligence: ProductIntelligenceResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const AdminDetailDataContext = createContext<AdminDetailContextType | null>(null);

// ── Provider ──────────────────────────────────────────
export function AdminDetailDataProvider({ children }: { children: React.ReactNode }) {
    const { authFetch } = useAuth();

    const [dailyUsers, setDailyUsers] = useState<DailyUserData[] | null>(null);
    const [genTrend, setGenTrend] = useState<GenerationTrendData[] | null>(null);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [topTags, setTopTags] = useState<Array<{ tag: string; count: number }> | null>(null);
    const [heavyUsers, setHeavyUsers] = useState<AdminDetailContextType['heavyUsers']>(null);
    const [deepInsight, setDeepInsight] = useState<DeepInsightData | null>(null);
    const [productIntelligence, setProductIntelligence] = useState<ProductIntelligenceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetched, setFetched] = useState(false);

    const fetchAllData = useCallback(async () => {
        if (fetched) return; // 이미 가져왔으면 패스
        setLoading(true);
        setError(null);

        try {
            const results = await Promise.allSettled([
                authFetch("/api/admin/analytics/daily-users?days=30"),
                authFetch("/api/admin/analytics/generation-trend?days=7"),
                authFetch("/api/admin/analytics/performance?days=30"),
                authFetch("/api/admin/analytics/top-tags?days=30&limit=10"),
                authFetch("/api/admin/analytics/heavy-users?days=30"),
                authFetch("/api/admin/analytics/deep-insights?days=30"),
                authFetch("/api/admin/analytics/product-intelligence?days=30"),
            ]);

            const [usersRes, genRes, perfRes, tagsRes, heavyRes, deepRes, prodIntelRes] = results;

            // Helper: 안전하게 JSON 파싱
            const safeJson = async (res: PromiseSettledResult<Response>) => {
                if (res.status === 'fulfilled' && res.value.ok) {
                    return await res.value.json();
                }
                return null;
            };

            const usersData = await safeJson(usersRes);
            if (Array.isArray(usersData)) setDailyUsers(usersData);

            const genData = await safeJson(genRes);
            if (Array.isArray(genData)) {
                setGenTrend(genData.sort((a: any, b: any) => String(a.date ?? '').localeCompare(String(b.date ?? ''))));
            }

            const perfData = await safeJson(perfRes);
            if (perfData && typeof perfData === 'object' && Array.isArray(perfData.failureStats)) {
                setPerformance(perfData);
            }

            const tagsData = await safeJson(tagsRes);
            if (Array.isArray(tagsData)) setTopTags(tagsData);

            const heavyData = await safeJson(heavyRes);
            if (Array.isArray(heavyData)) setHeavyUsers(heavyData);

            const deepData = await safeJson(deepRes);
            if (deepData && typeof deepData === 'object') {
                setDeepInsight(deepData);
            }

            const prodIntelData = await safeJson(prodIntelRes);
            if (prodIntelData && typeof prodIntelData === 'object') {
                setProductIntelligence(prodIntelData);
            }

            setFetched(true);
        } catch (e: any) {
            console.error("Failed to fetch admin detail data", e);
            setError(e.message || "데이터 로딩 실패");
        } finally {
            setLoading(false);
        }
    }, [authFetch, fetched]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const refetch = useCallback(async () => {
        setFetched(false);
        await fetchAllData(); // Ensure refetch actually triggers a new fetch
    }, [fetchAllData]);

    const value = useMemo(() => ({
        dailyUsers, genTrend, performance, topTags, heavyUsers,
        deepInsight,
        productIntelligence,
        loading,
        error,
        refetch,
    }), [dailyUsers, genTrend, performance, topTags, heavyUsers, deepInsight, productIntelligence, loading, error, refetch]);

    return (
        <AdminDetailDataContext.Provider value={value}>
            {children}
        </AdminDetailDataContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────
export function useAdminDetailData() {
    const ctx = useContext(AdminDetailDataContext);
    if (!ctx) throw new Error("useAdminDetailData must be used within AdminDetailDataProvider");
    return ctx;
}
