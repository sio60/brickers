'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { getMyOverview, getMyProfile, getMyJobs, updateMyProfile, ApiError } from "@/lib/api/myApi";
import type { MyOverview, MyProfile, MyJob } from "@/lib/api/myApi";
import styles from "@/app/mypage/MyPage.module.css";

export type MenuItem = "profile" | "membership" | "jobs" | "inquiries" | "reports" | "refunds" | "settings" | "delete";

interface UseMyPageDataParams {
    language: string;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    setUser: (user: any) => void;
    t: any;
}

export default function useMyPageData({
    language,
    isAuthenticated,
    isAuthLoading,
    authFetch,
    setUser,
    t,
}: UseMyPageDataParams) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");

    const [jobsList, setJobsList] = useState<MyJob[]>([]);
    const [jobsPage, setJobsPage] = useState(0);
    const [jobsTotalPages, setJobsTotalPages] = useState(1);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [jobSort, setJobSort] = useState<'latest' | 'oldest'>('latest');
    const jobsSentinelRef = useRef<HTMLDivElement | null>(null);

    // 문의/신고 내역 상태
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState(false);

    // 결제/환불 내역 상태
    const [refundOrders, setRefundOrders] = useState<any[]>([]);
    const [refundLoading, setRefundLoading] = useState(false);

    // 프로필 수정 관련 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [editBio, setEditBio] = useState("");
    const [saving, setSaving] = useState(false);

    // 확장 상태 (문의/신고)
    const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    // --- Functions ---

    const loadJobsPage = async (page: number, replace = false) => {
        try {
            setJobsLoading(true);
            const res = await getMyJobs(page, 12);
            setJobsTotalPages(res.totalPages || 1);
            setJobsPage(page);
            setJobsList((prev) => replace ? res.content : prev.concat(res.content));
        } catch (err) {
            console.error('[MyPage] Failed to load jobs:', err);
        } finally {
            setJobsLoading(false);
        }
    };

    const resetAndLoadJobs = useCallback(() => {
        setJobsList([]);
        setJobsPage(0);
        setJobsTotalPages(1);
        loadJobsPage(0, true);
    }, []);

    const refreshOverview = useCallback(async () => {
        try {
            const updated = await getMyOverview();
            setData(updated);
        } catch (e) {
            console.error("refreshOverview failed", e);
        }
    }, []);

    // 수정 모드 진입 시 현재 값으로 초기화
    const startEditing = () => {
        if (profile) {
            setEditNickname(profile.nickname || "");
            setEditBio(profile.bio || "");
        }
        setIsEditing(true);
    };

    // 수정 취소
    const cancelEditing = () => {
        setIsEditing(false);
    };

    // 프로필 저장 (닉네임, 자기소개만)
    const saveProfile = async () => {
        try {
            setSaving(true);
            const updated = await updateMyProfile({
                nickname: editNickname,
                bio: editBio,
            });
            setProfile(updated);
            setUser(updated); // Sync with global AuthContext
            setIsEditing(false);
            alert(t.profile.alertSaved);
        } catch {
            alert(t.profile.alertFailed);
        } finally {
            setSaving(false);
        }
    };

    const fetchMyInquiries = async () => {
        try {
            setListLoading(true);
            const res = await authFetch("/api/inquiries/my?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch inquiries", e);
        } finally {
            setListLoading(false);
        }
    };

    const fetchMyReports = async () => {
        try {
            setListLoading(true);
            const res = await authFetch("/api/reports/my?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setReports(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch reports", e);
        } finally {
            setListLoading(false);
        }
    };

    const fetchMyRefunds = async () => {
        try {
            setRefundLoading(true);
            const res = await authFetch("/api/payments/my/history?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setRefundOrders(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch refund history", e);
        } finally {
            setRefundLoading(false);
        }
    };

    // --- Label / Status Helpers ---

    const getStatusLabel = (status: MyJob["status"] | string) => {
        const statusMap: Record<string, string> = t.jobs.status || {};
        return statusMap[status] || status;
    };

    const getStatusClass = (status: MyJob["status"] | string) => {
        switch (status) {
            case "QUEUED": return "pending";
            case "RUNNING": return "running";
            case "CANCELED": return "paused";
            case "DONE": return "completed";
            case "FAILED": return "failed";
            default: return "";
        }
    };

    const getReportStatusLabel = (status: string) => t.reports?.status?.[status] || status;
    const getReportReasonLabel = (reason: string) => t.reports?.reasons?.[reason] || reason;
    const getReportTargetLabel = (type: string) => t.reports?.targets?.[type] || type;
    const getInquiryStatusLabel = (status: string) => t.inquiries?.status?.[status] || status;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
    };

    const getRefundStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = (t as any).refunds?.status || {};
        return statusMap[status] || status;
    };

    const getRefundStatusClass = (status: string) => {
        switch (status) {
            case "COMPLETED": return styles.answered;
            case "REFUND_REQUESTED": return styles.pending;
            case "REFUNDED": return styles.resolved;
            default: return "";
        }
    };

    // --- Effects ---

    // Auth check + initial data fetch
    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);

        Promise.all([getMyOverview(), getMyProfile()])
            .then(([overviewRes, profileRes]) => {
                setData(overviewRes);
                setProfile(profileRes);
                setLoading(false);
            })
            .catch((err) => {
                if (err instanceof ApiError) {
                    setError({ message: err.message, status: err.status });
                } else {
                    setError({ message: err instanceof Error ? err.message : "Unknown Error", status: 0 });
                }
                setLoading(false);
            });
    }, [language, isAuthenticated, isAuthLoading]);

    // Jobs loading when activeMenu === 'jobs'
    useEffect(() => {
        if (activeMenu !== 'jobs') return;
        resetAndLoadJobs();
    }, [activeMenu, jobSort]);

    // Infinite scroll observer
    useEffect(() => {
        if (activeMenu !== 'jobs') return;
        const sentinel = jobsSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (!entry.isIntersecting) return;
            if (jobsLoading) return;
            if (jobsPage + 1 >= jobsTotalPages) return;
            loadJobsPage(jobsPage + 1);
        }, { root: null, rootMargin: '200px', threshold: 0.1 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeMenu, jobsPage, jobsTotalPages, jobsLoading]);

    // Tab-based polling + fetch effect
    useEffect(() => {
        let intervalId: any;

        if (activeMenu === "jobs") {
            const fetchJobs = async () => {
                try {
                    const updated = await getMyOverview();
                    setData(updated);
                } catch (e) {
                    console.error("Polling failed", e);
                }
            };
            intervalId = setInterval(fetchJobs, 3000);
            fetchJobs(); // Fetch immediately on switch
        }

        if (activeMenu === "inquiries") fetchMyInquiries();
        if (activeMenu === "reports") fetchMyReports();
        if (activeMenu === "refunds") fetchMyRefunds();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeMenu]);

    return {
        // State
        loading,
        data,
        profile,
        setProfile,
        error,
        activeMenu,
        setActiveMenu,
        jobsList,
        jobsPage,
        jobsTotalPages,
        jobsLoading,
        jobSort,
        setJobSort,
        jobsSentinelRef,
        inquiries,
        reports,
        refundOrders,
        listLoading,
        refundLoading,
        isEditing,
        editNickname,
        setEditNickname,
        editBio,
        setEditBio,
        saving,
        expandedInquiryId,
        setExpandedInquiryId,
        expandedReportId,
        setExpandedReportId,

        // Functions
        loadJobsPage,
        resetAndLoadJobs,
        refreshOverview,
        startEditing,
        cancelEditing,
        saveProfile,
        fetchMyInquiries,
        fetchMyReports,
        fetchMyRefunds,
        getStatusLabel,
        getStatusClass,
        getReportStatusLabel,
        getReportReasonLabel,
        getReportTargetLabel,
        getInquiryStatusLabel,
        formatDate,
        getRefundStatusLabel,
        getRefundStatusClass,
    };
}
