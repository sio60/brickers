"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AdminStats } from "@/lib/api/myApi";
import type { User } from "@/components/admin/UsersTab";
import type { AdminJob } from "@/components/admin/JobsTab";
import type { Comment } from "@/components/admin/CommentsTab";
import type { Inquiry } from "@/components/admin/InquiriesTab";
import type { Report } from "@/components/admin/ReportsTab";
import type { RefundRequest } from "@/components/admin/RefundsTab";

const createdAtTime = (createdAt?: string) => {
    if (!createdAt) return 0;
    const time = new Date(createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const sortInquiriesByPendingAnswer = (items: Inquiry[]) => {
    return [...items].sort((a, b) => {
        const aPending = !a.answer?.content?.trim();
        const bPending = !b.answer?.content?.trim();
        if (aPending !== bPending) return aPending ? -1 : 1;
        return createdAtTime(a.createdAt) - createdAtTime(b.createdAt);
    });
};

const sortReportsByPendingAnswer = (items: Report[]) => {
    return [...items].sort((a, b) => {
        const aPending = a.status === "PENDING" || !a.resolutionNote?.trim();
        const bPending = b.status === "PENDING" || !b.resolutionNote?.trim();
        if (aPending !== bPending) return aPending ? -1 : 1;
        return createdAtTime(a.createdAt) - createdAtTime(b.createdAt);
    });
};

export function useAdminData(activeTab: string) {
    const { authFetch } = useAuth();
    const { t } = useLanguage();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [jobs, setJobs] = useState<AdminJob[]>([]);
    const [jobPage, setJobPage] = useState(0);
    const [jobTotalPages, setJobTotalPages] = useState(0);

    const [userSearch, setUserSearch] = useState("");
    const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [reportedOnly, setReportedOnly] = useState(false);

    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState("");

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentPage, setCommentPage] = useState(0);
    const [commentTotalPages, setCommentTotalPages] = useState(0);

    // 디바운싱 로직
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUserSearch(userSearch);
            setJobPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [userSearch]);

    // 대시보드 스태츠
    const fetchDashboardStats = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/dashboard");
            if (res.ok) {
                const data = (await res.json()) as AdminStats;
                setStats(data);
            }
        } catch (error) {
            console.error("[useAdminData] failed to fetch dashboard stats", error);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    // 각 탭 데이터 페칭
    const fetchInquiries = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/inquiries?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(sortInquiriesByPendingAnswer(data.content || []));
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/users?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    const fetchComments = useCallback(async () => {
        try {
            const res = await authFetch(`/api/admin/comments?page=${commentPage}&size=20&sort=createdAt,desc`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.content || []);
                setCommentTotalPages(data.totalPages || 0);
            }
        } catch (error) {
            console.error("Failed to fetch comments", error);
        }
    }, [authFetch, commentPage]);

    const fetchJobs = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append("page", jobPage.toString());
            params.append("size", "50");
            if (debouncedUserSearch) params.append("userSearch", debouncedUserSearch);
            if (filterStatus) params.append("status", filterStatus);
            if (reportedOnly) params.append("reported", "true");

            const res = await authFetch(`/api/admin/jobs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data.content || []);
                setJobTotalPages(data.totalPages || 0);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch, jobPage, debouncedUserSearch, filterStatus, reportedOnly]);

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

    const fetchRefunds = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/payments/refund-requests?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                const mapped = (data.content || []).map((item: any) => ({
                    id: item.id,
                    orderId: item.id,
                    orderNo: item.orderNo || item.id,
                    amount: item.amount,
                    status: item.status,
                    requestedAt: item.updatedAt || item.createdAt,
                    userId: item.userId,
                    itemName: item.itemName,
                    cancelReason: item.cancelReason,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                }));
                setRefunds(mapped);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    // 탭 변경 시 데이터 로드
    useEffect(() => {
        if (activeTab === "inquiries") fetchInquiries();
        if (activeTab === "reports") fetchReports();
        if (activeTab === "refunds") fetchRefunds();
        if (activeTab === "users") fetchUsers();
        if (activeTab === "comments") fetchComments();
        if (activeTab === "jobs") fetchJobs();
    }, [activeTab, fetchInquiries, fetchReports, fetchRefunds, fetchUsers, fetchComments, fetchJobs]);

    // 핸들러들
    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            const res = await authFetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted: true } : c));
            }
        } catch (error) {
            console.error("Error deleting comment", error);
        }
    };

    const handleUserSuspend = async (userId: string) => {
        const reason = prompt(t.admin.users?.suspendReason || "Enter reason for suspension:");
        if (reason === null) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/suspend`, {
                method: "POST",
                body: JSON.stringify({ reason: reason || "Admin suspended" })
            });
            if (res.ok) {
                alert(t.admin.users?.suspended || "User suspended.");
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUserActivate = async (userId: string) => {
        if (!confirm(t.admin.users?.confirmActivate || "Activate this user?")) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/activate`, { method: "POST" });
            if (res.ok) {
                alert(t.admin.users?.activated || "User activated.");
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUserRoleChange = async (userId: string, nextRole: "USER" | "ADMIN") => {
        if (!confirm(`Change user role to ${nextRole}?`)) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/role`, {
                method: "POST",
                body: JSON.stringify({ role: nextRole })
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleJobAction = async (jobId: string, action: 'retry' | 'cancel') => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        try {
            const res = await authFetch(`/api/admin/jobs/${jobId}/${action}`, { method: "POST" });
            if (res.ok) {
                fetchJobs();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAnswerSubmit = async (inquiryId: string) => {
        const content = answerTexts[inquiryId];
        if (!content?.trim()) return;
        try {
            const res = await authFetch(`/api/admin/inquiries/${inquiryId}/answer`, {
                method: "POST",
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [inquiryId]: "" }));
                fetchInquiries();
            }
        } catch (e) {
            console.error(e);
        }
    };

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

    const handleRefundApprove = async (orderId: string) => {
        if (!confirm(t.admin.refund.confirmApprove)) return;
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/approve-refund`, { method: "POST", body: JSON.stringify({}) });
            if (res.ok) fetchRefunds();
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefundReject = async (orderId: string) => {
        const reason = answerTexts[orderId];
        if (!reason?.trim()) return;
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/reject-refund`, { method: "POST", body: JSON.stringify({ reason }) });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [orderId]: "" }));
                fetchRefunds();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        stats,
        inquiries,
        reports,
        refunds,
        users,
        jobs,
        jobPage,
        setJobPage,
        jobTotalPages,
        userSearch,
        setUserSearch,
        filterStatus,
        setFilterStatus,
        reportedOnly,
        setReportedOnly,
        answerTexts,
        setAnswerTexts,
        searchTerm,
        setSearchTerm,
        comments,
        commentPage,
        setCommentPage,
        commentTotalPages,
        fetchJobs,
        fetchUsers,
        fetchComments,
        handleDeleteComment,
        handleUserSuspend,
        handleUserActivate,
        handleUserRoleChange,
        handleJobAction,
        handleAnswerSubmit,
        handleReportResolve,
        handleRefundApprove,
        handleRefundReject,
    };
}
