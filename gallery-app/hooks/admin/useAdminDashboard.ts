"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminStats } from "@/lib/api/myApi";

export function useAdminDashboard() {
    const { authFetch } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/dashboard");
            if (res.ok) {
                const data = (await res.json()) as AdminStats;
                setStats(data);
            }
        } catch (error) {
            console.error("[useAdminDashboard] failed to fetch dashboard stats", error);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    return { stats };
}
