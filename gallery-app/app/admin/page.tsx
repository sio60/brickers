'use client';

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, getAdminStats, AdminStats } from "@/lib/api/myApi";
import GalleryManagement from "@/components/admin/GalleryManagement";
import styles from "./AdminPage.module.css";
import AdminAIReport from "@/components/admin/AdminAIReport";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const BrickJudgeViewer = dynamic(() => import("@/components/admin/BrickJudgeViewer"), { ssr: false });

// 타입 정의
type Inquiry = {
    id: string;
    title: string;
    content: string;
    status: string;
    createdAt: string;
    userId: string;
    userEmail?: string;
    answer?: {
        content: string;
        answeredAt: string;
    }
};

type Report = {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    details: string;
    status: string;
    createdAt: string;
    createdBy: string;
    reporterEmail?: string;
    resolutionNote?: string;
};

type RefundRequest = {
    id: string;
    orderId: string;
    orderNo: string;
    amount: number;
    status: string;
    requestedAt: string;
    userId: string;
    itemName?: string;
    cancelReason?: string;
    createdAt: string;
    updatedAt: string;
};

// [NEW] 사용자 타입 정의 (구조 복구)
type User = {
    id: string;
    email: string;
    nickname: string;
    profileImage?: string;
    role: string;
    membershipPlan: string;
    accountState: string;
    createdAt: string;
    lastLoginAt?: string;
    suspendedAt?: string;
    suspendedReason?: string;
};

// [NEW] 작업(Job) 타입 정의
type AdminJob = {
    id: string;
    userId: string;
    userInfo?: {
        id: string;
        email: string;
        nickname: string;
    };
    title: string;
    status: string;
    stage: string;
    sourceImageUrl?: string;
    previewImageUrl?: string;
    createdAt: string;
    updatedAt: string;
    errorMessage?: string;
};

// [NEW] 댓글 타입 정의
type Comment = {
    id: string;
    postId: string;
    authorId: string;
    authorNickname: string;
    content: string;
    deleted: boolean;
    createdAt: string;
    updatedAt: string;
};

export default function AdminPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge">("dashboard");

    // 데이터 상태
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [jobs, setJobs] = useState<AdminJob[]>([]); // [NEW]
    const [jobPage, setJobPage] = useState(0);
    const [jobTotalPages, setJobTotalPages] = useState(0);
    // [NEW] 필터링 상태
    const [userSearch, setUserSearch] = useState("");
    const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [reportedOnly, setReportedOnly] = useState(false);

    // 답변 입력 상태
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
    // [NEW] 사용자 검색 상태
    const [searchTerm, setSearchTerm] = useState("");

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentPage, setCommentPage] = useState(0);
    const [commentTotalPages, setCommentTotalPages] = useState(0);



    // 검색어 디바운싱
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUserSearch(userSearch);
            setJobPage(0); // 검색어 변경 시 페이지 초기화
        }, 500);
        return () => clearTimeout(timer);
    }, [userSearch]);



    useEffect(() => {
        if (activeTab === "jobs") {
            setJobPage(0); // 탭 변경/필터 변경 시 페이지 초기화 확인 필요하나, 여기선 의존성 때문에 별도 처리
        }
    }, [filterStatus]);

    useEffect(() => {
        getMyProfile()
            .then(profile => {
                if (profile.role === "ADMIN") {
                    return getAdminStats();
                } else {
                    alert(t.admin.accessDenied.replace("{role}", profile.role));
                    router.replace("/");
                }
            })
            .then(s => {
                if (s) {
                    setStats(s);
                    setLoading(false);
                }
            })
            .catch(() => {
                router.replace("/");
            });
    }, [router, t.admin.accessDenied]);

    // 탭 변경 시 데이터 로드
    useEffect(() => {
        if (activeTab === "inquiries") fetchInquiries();
        if (activeTab === "reports") fetchReports();
        if (activeTab === "refunds") fetchRefunds();
        if (activeTab === "users") fetchUsers();
        if (activeTab === "comments") fetchComments();
        if (activeTab === "jobs") fetchJobs(); // [NEW]
    }, [activeTab, commentPage, jobPage, debouncedUserSearch, filterStatus, reportedOnly]);

    const fetchInquiries = async () => {
        try {
            const res = await authFetch("/api/admin/inquiries?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // [NEW] 사용자 목록 조회
    const fetchUsers = async () => {
        try {
            // TODO: 검색 기능 추가 시 쿼리 파라미터 연동
            const res = await authFetch("/api/admin/users?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // [NEW] 댓글 목록 조회
    const fetchComments = async () => {
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
    };

    // [NEW] 작업 목록 조회
    const fetchJobs = async () => {
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
    };

    // [NEW] 댓글 삭제
    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            const res = await authFetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                // Remove from list or mark deleted
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted: true } : c));
            } else {
                alert("Failed to delete comment");
            }
        } catch (error) {
            console.error("Error deleting comment", error);
        }
    };

    // [NEW] 사용자 정지
    const handleUserSuspend = async (userId: string) => {
        const reason = prompt(t.admin.users?.suspendReason || "Enter reason for suspension:");
        if (reason === null) return; // 취소

        try {
            const res = await authFetch(`/api/admin/users/${userId}/suspend`, {
                method: "POST",
                body: JSON.stringify({ reason: reason || "Admin suspended" })
            });
            if (res.ok) {
                alert(t.admin.users?.suspended || "User suspended.");
                fetchUsers();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    // [NEW] 사용자 정지 해제
    const handleUserActivate = async (userId: string) => {
        if (!confirm(t.admin.users?.confirmActivate || "Activate this user?")) return;

        try {
            const res = await authFetch(`/api/admin/users/${userId}/activate`, {
                method: "POST"
            });
            if (res.ok) {
                alert(t.admin.users?.activated || "User activated.");
                fetchUsers();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    // [NEW] 작업 중단/재시도 핸들러
    const handleJobAction = async (jobId: string, action: 'retry' | 'cancel') => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        try {
            const res = await authFetch(`/api/admin/jobs/${jobId}/${action}`, { method: "POST" });
            if (res.ok) {
                alert(`Job ${action}ed successfully.`);
                fetchJobs();
            } else {
                alert("Failed to perform action.");
            }
        } catch (e) {
            console.error(e);
            alert("Error occurred.");
        }
    };

    const handleAnswerSubmit = async (inquiryId: string) => {
        const content = answerTexts[inquiryId];
        if (!content || !content.trim()) {
            alert(t.admin.inquiry.inputRequired);
            return;
        }

        try {
            const res = await authFetch(`/api/admin/inquiries/${inquiryId}/answer`, {
                method: "POST",
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                alert(t.admin.inquiry.success);
                setAnswerTexts(prev => ({ ...prev, [inquiryId]: "" }));
                fetchInquiries();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    const handleReportResolve = async (reportId: string, approve: boolean) => {
        const note = answerTexts[reportId];
        if (!note || !note.trim()) {
            alert(t.admin.report.inputRequired);
            return;
        }

        try {
            const res = await authFetch(`/api/admin/reports/${reportId}/resolve`, {
                method: "POST",
                body: JSON.stringify({
                    action: approve ? "APPROVE" : "REJECT",
                    note
                })
            });

            if (res.ok) {
                alert(approve ? t.admin.report.resolved : t.admin.report.rejected);
                setAnswerTexts(prev => ({ ...prev, [reportId]: "" }));
                fetchReports();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    const fetchReports = async () => {
        try {
            const res = await authFetch("/api/admin/reports?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setReports(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchRefunds = async () => {
        try {
            const res = await authFetch("/api/admin/payments/refund-requests?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                // 백엔드 AdminPaymentDto를 RefundRequest 형태로 매핑
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
    };

    // 환불 승인 처리
    const handleRefundApprove = async (orderId: string) => {
        if (!confirm(t.admin.refund.confirmApprove)) return;
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/approve-refund`, {
                method: "POST",
                body: JSON.stringify({})
            });
            if (res.ok) {
                alert(t.admin.refund.approved);
                fetchRefunds();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    // 환불 거절 처리
    const handleRefundReject = async (orderId: string) => {
        const reason = answerTexts[orderId];
        if (!reason || !reason.trim()) {
            alert(t.admin.refund.inputRequired);
            return;
        }
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/reject-refund`, {
                method: "POST",
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                alert(t.admin.refund.rejected);
                setAnswerTexts(prev => ({ ...prev, [orderId]: "" }));
                fetchRefunds();
            } else {
                alert(t.admin.failed);
            }
        } catch (e) {
            console.error(e);
            alert(t.admin.error);
        }
    };

    if (loading) return null;

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

            <div className={styles.container}>
                <div className={styles.layout}>
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarTitle}>{t.admin.panelTitle}</div>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "dashboard" ? styles.active : ""}`}
                            onClick={() => setActiveTab("dashboard")}
                        >
                            {t.admin.sidebar.dashboard}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "users" ? styles.active : ""}`}
                            onClick={() => setActiveTab("users")}
                        >
                            {t.admin.sidebar.users}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "jobs" ? styles.active : ""}`}
                            onClick={() => setActiveTab("jobs")}
                        >
                            {t.admin.sidebar.jobs || "All Jobs"}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "comments" ? styles.active : ""}`}
                            onClick={() => setActiveTab("comments")}
                        >
                            {t.admin.sidebar.comments}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "inquiries" ? styles.active : ""}`}
                            onClick={() => setActiveTab("inquiries")}
                        >
                            {t.admin.sidebar.inquiries}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "reports" ? styles.active : ""}`}
                            onClick={() => setActiveTab("reports")}
                        >
                            {t.admin.sidebar.reports}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "refunds" ? styles.active : ""}`}
                            onClick={() => setActiveTab("refunds")}
                        >
                            {t.admin.sidebar.refunds}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "gallery" ? styles.active : ""}`}
                            onClick={() => setActiveTab("gallery")}
                        >
                            {t.admin.sidebar.gallery}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "brick-judge" ? styles.active : ""}`}
                            onClick={() => setActiveTab("brick-judge")}
                        >
                            {t.admin.brickJudge?.title || "Brick Judge"}
                        </button>
                    </aside>

                    <main className={styles.content}>
                        <header className={styles.header}>
                            <h1 className={styles.title}>
                                {activeTab === "dashboard" && t.floatingMenu.admin}
                                {activeTab === "users" && t.admin.sidebar.users}
                                {activeTab === "jobs" && (t.admin.sidebar.jobs || "All Jobs")}
                                {activeTab === "inquiries" && t.admin.sidebar.inquiries}
                                {activeTab === "reports" && t.admin.sidebar.reports}
                                {activeTab === "refunds" && t.admin.sidebar.refunds}
                                {activeTab === "comments" && t.admin.sidebar.comments}
                                {activeTab === "brick-judge" && (t.admin.brickJudge?.title || "Brick Judge")}
                                {activeTab === "gallery" && t.admin.sidebar.gallery}
                            </h1>
                            <button className={styles.closeBtn} onClick={() => router.back()}>✕</button>
                        </header>

                        {activeTab === "dashboard" && (
                            <div className={styles.dashboard}>
                                <p>{t.admin.welcome}</p>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <h3>{t.admin.stats.users}</h3>
                                        <p className={styles.statValue}>{stats?.totalUsers ?? "--"}</p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <h3>{t.admin.stats.jobs}</h3>
                                        <p className={styles.statValue}>{stats?.totalJobs ?? "--"}</p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <h3>{t.admin.stats.gallery}</h3>
                                        <p className={styles.statValue}>{stats?.totalGalleryPosts ?? "--"}</p>
                                    </div>
                                </div>

                                <AdminAIReport activeTab={activeTab} />
                            </div>
                        )}

                        {/* [NEW] Jobs Tab */}
                        {activeTab === "jobs" && (
                            <div className={styles.list}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">{t.admin.jobs?.title || "All Jobs Management"}</h2>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={t.admin.jobs?.searchPlaceholder || "User Search (Nickname/Email)"}
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm w-64"
                                        />
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="">{t.admin.jobs?.filter?.all || "All Status"}</option>
                                            <option value="QUEUED">{t.admin.jobs?.filter?.queued || "Queued"}</option>
                                            <option value="RUNNING">{t.admin.jobs?.filter?.running || "Running"}</option>
                                            <option value="DONE">{t.admin.jobs?.filter?.done || "Done"}</option>
                                            <option value="FAILED">{t.admin.jobs?.filter?.failed || "Failed"}</option>
                                            <option value="CANCELED">{t.admin.jobs?.filter?.canceled || "Canceled"}</option>
                                        </select>
                                        <label className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded text-sm bg-white cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={reportedOnly}
                                                onChange={(e) => setReportedOnly(e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                            {t.admin.jobs?.filter?.reportedOnly || "View Reported Only"}
                                        </label>
                                        <button onClick={fetchJobs} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                                            {t.admin.jobs?.action?.refresh || "Refresh"}
                                        </button>
                                    </div>
                                </div>
                                <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t.admin.jobs?.table?.image || "Image"}</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t.admin.jobs?.table?.jobInfo || "Job Info"}</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t.admin.jobs?.table?.user || "User"}</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t.admin.jobs?.table?.status || "Status"}</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t.admin.jobs?.table?.dates || "Dates"}</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">{t.admin.jobs?.table?.actions || "Actions"}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {jobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative">
                                                        {job.previewImageUrl || job.sourceImageUrl ? (
                                                            <img src={job.previewImageUrl || job.sourceImageUrl} alt="job" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full text-gray-300">{t.admin.jobs?.table?.noImage || "No Img"}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-sm text-gray-900">{job.title || (t.admin.jobs?.table?.untitledJob || "Untitled Job")}</div>
                                                    <div className="text-xs text-gray-500 font-mono" title={job.id}>{job.id.substring(0, 8)}...</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{job.userInfo?.nickname || (t.admin.jobs?.table?.unknownUser || "Unknown")}</div>
                                                    <div className="text-xs text-gray-500">{job.userInfo?.email || job.userId}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium 
                                                        ${job.status === 'DONE' ? 'bg-green-100 text-green-800' :
                                                            job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                                job.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {job.status}
                                                    </span>
                                                    <div className="text-xs text-gray-500 mt-1">{job.stage}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    <div>{t.admin.jobs?.table?.created || "Created"}: {new Date(job.createdAt).toLocaleDateString()}</div>
                                                    <div>{t.admin.jobs?.table?.updated || "Updated"}: {new Date(job.updatedAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {(job.status === 'FAILED' || job.status === 'CANCELED') && (
                                                            <button
                                                                onClick={() => handleJobAction(job.id, 'retry')}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                                                            >
                                                                {t.admin.jobs?.action?.retry || "Retry"}
                                                            </button>
                                                        )}
                                                        {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                                                            <button
                                                                onClick={() => handleJobAction(job.id, 'cancel')}
                                                                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                                            >
                                                                {t.admin.jobs?.action?.cancel || "Cancel"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {jobs.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t.admin.jobs?.empty || "No jobs found."}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {/* Pagination for Jobs */}
                                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-lg">
                                    <button
                                        disabled={jobPage === 0}
                                        onClick={() => setJobPage((p: number) => p - 1)}
                                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                                    >
                                        {t.admin.jobs?.pagination?.previous || "Previous"}
                                    </button>
                                    <span className="text-xs text-gray-500">{t.admin.jobs?.pagination?.page || "Page"} {jobPage + 1} {t.admin.jobs?.pagination?.of || "of"} {jobTotalPages || 1}</span>
                                    <button
                                        disabled={jobPage >= jobTotalPages - 1}
                                        onClick={() => setJobPage((p: number) => p + 1)}
                                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                                    >
                                        {t.admin.jobs?.pagination?.next || "Next"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Comments Tab */}
                        {activeTab === "comments" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">Comments Management</h2>
                                    <button onClick={fetchComments} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                        Refresh
                                    </button>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                                                <th className="px-6 py-4">Content</th>
                                                <th className="px-6 py-4 w-40">Author</th>
                                                <th className="px-6 py-4 w-32">Post ID</th>
                                                <th className="px-6 py-4 w-40">Date</th>
                                                <th className="px-6 py-4 w-24">Status</th>
                                                <th className="px-6 py-4 w-24 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {comments.map((comment: Comment) => (
                                                <tr key={comment.id} className="hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-md break-words">{comment.content}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{comment.authorNickname || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{comment.postId.substring(0, 8)}...</td>
                                                    <td className="px-6 py-4 text-xs text-gray-500">
                                                        {new Date(comment.createdAt).toLocaleDateString()} <br />
                                                        {new Date(comment.createdAt).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {comment.deleted ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                Deleted
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {!comment.deleted && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {comments.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                        No comments found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    {/* Pagination (Simple) */}
                                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                                        <button
                                            disabled={commentPage === 0}
                                            onClick={() => setCommentPage((p: number) => p - 1)}
                                            className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-gray-500">Page {commentPage + 1} of {commentTotalPages || 1}</span>
                                        <button
                                            disabled={commentPage >= commentTotalPages - 1}
                                            onClick={() => setCommentPage((p: number) => p + 1)}
                                            className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === "users" && (
                            <div className={styles.list}>
                                <div className={styles.searchBar} style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                                    <input
                                        type="text"
                                        placeholder={t.admin.users?.searchPlaceholder || "Search by email or nickname..."}
                                        value={searchTerm}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
                                    />
                                    <button onClick={fetchUsers} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer" }}>
                                        Search
                                    </button>
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden" }}>
                                    <thead style={{ background: "#f5f5f5" }}>
                                        <tr>
                                            <th style={{ padding: "12px", textAlign: "left" }}>User info</th>
                                            <th style={{ padding: "12px", textAlign: "left" }}>Membership</th>
                                            <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                                            <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter((u: User) =>
                                            u.email?.includes(searchTerm) || u.nickname?.includes(searchTerm)
                                        ).map((user: User) => (
                                            <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ padding: "12px" }}>
                                                    <div style={{ fontWeight: "bold" }}>{user.nickname}</div>
                                                    <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
                                                    <div style={{ fontSize: "11px", color: "#999" }}>Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <span className={`${styles.statusBadge} ${user.membershipPlan === "PRO" ? styles.pro : styles.free}`}
                                                        style={{ background: user.membershipPlan === "PRO" ? "#e6f7ff" : "#f5f5f5", color: user.membershipPlan === "PRO" ? "#1890ff" : "#666", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
                                                        {user.membershipPlan}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    <span className={`${styles.statusBadge}`}
                                                        style={{
                                                            background: user.accountState === "ACTIVE" ? "#f6ffed" : user.accountState === "SUSPENDED" ? "#fff1f0" : "#fffbe6",
                                                            color: user.accountState === "ACTIVE" ? "#52c41a" : user.accountState === "SUSPENDED" ? "#f5222d" : "#faad14",
                                                            padding: "4px 8px", borderRadius: "4px", fontSize: "12px"
                                                        }}>
                                                        {user.accountState}
                                                        {user.suspendedReason && <div style={{ fontSize: "10px", marginTop: "2px" }}>({user.suspendedReason})</div>}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px" }}>
                                                    {user.accountState === "ACTIVE" ? (
                                                        <button
                                                            onClick={() => handleUserSuspend(user.id)}
                                                            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ff4d4f", background: "#fff", color: "#ff4d4f", cursor: "pointer", fontSize: "12px" }}
                                                        >
                                                            Suspend
                                                        </button>
                                                    ) : user.accountState === "SUSPENDED" ? (
                                                        <button
                                                            onClick={() => handleUserActivate(user.id)}
                                                            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #52c41a", background: "#fff", color: "#52c41a", cursor: "pointer", fontSize: "12px" }}
                                                        >
                                                            Activate
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {users.length === 0 && <p className={styles.emptyMsg} style={{ padding: "20px", textAlign: "center", color: "#999" }}>{t.admin.users?.empty || "No users found."}</p>}
                            </div>
                        )}

                        {activeTab === "inquiries" && (
                            <div className={styles.list}>
                                {inquiries.map(item => (
                                    <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                                        <div className={styles.inquiryMain}>
                                            <h4>
                                                {item.title}
                                                <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p>{item.content}</p>
                                            <div className={styles.meta}>
                                                {item.userEmail || item.userId} • {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className={styles.answerSection}>
                                            {item.answer ? (
                                                <div className={`${styles.answer} ${styles.active}`}>
                                                    <div className={styles.answerLabel}>{t.admin.inquiry.adminAnswer}</div>
                                                    <div className={styles.answerContent}>{item.answer.content}</div>
                                                    <div className={styles.answerDate}>
                                                        {new Date(item.answer.answeredAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.answerForm}>
                                                    <textarea
                                                        placeholder={t.admin.inquiry.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <button onClick={() => handleAnswerSubmit(item.id)}>
                                                        {t.admin.inquiry.submit}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {inquiries.length === 0 && <p className={styles.emptyMsg}>{t.admin.inquiry.empty}</p>}
                            </div>
                        )}

                        {activeTab === "reports" && (
                            <div className={styles.list}>
                                {reports.map(item => (
                                    <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                                        <div className={styles.inquiryMain}>
                                            <h4>
                                                {item.reason}
                                                <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p>{item.details}</p>
                                            <div className={styles.meta}>
                                                {t.admin.label.target}: {item.targetType}({item.targetId}) •
                                                {t.admin.label.reporter}: {item.reporterEmail || item.createdBy} •
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className={styles.answerSection}>
                                            {item.status !== "PENDING" ? (
                                                <div className={`${styles.answer} ${styles.active}`}>
                                                    <div className={styles.answerLabel}>
                                                        {item.status === "RESOLVED" ? t.admin.report.actionComplete : t.admin.report.actionRejected}
                                                    </div>
                                                    <div className={styles.answerContent}>{item.resolutionNote}</div>
                                                </div>
                                            ) : (
                                                <div className={styles.answerForm}>
                                                    <textarea
                                                        placeholder={t.admin.report.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.rejectBtn}
                                                            onClick={() => handleReportResolve(item.id, false)}
                                                        >
                                                            {t.admin.report.reject}
                                                        </button>
                                                        <button onClick={() => handleReportResolve(item.id, true)}>
                                                            {t.admin.report.resolve}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {reports.length === 0 && <p className={styles.emptyMsg}>{t.admin.report.empty}</p>}
                            </div>
                        )}

                        {activeTab === "refunds" && (
                            <div className={styles.list}>
                                {refunds.map(item => (
                                    <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                                        <div className={styles.inquiryMain}>
                                            <h4>
                                                {t.admin.refund.orderNo}: {item.orderNo}
                                                <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p>
                                                {item.itemName && <><strong>{t.admin.refund.planName}:</strong> {item.itemName}<br /></>}
                                                <strong>{t.admin.refund.amount}:</strong> {item.amount?.toLocaleString()}
                                            </p>
                                            {item.cancelReason && (
                                                <p><strong>{t.admin.refund.reason}:</strong> {item.cancelReason}</p>
                                            )}
                                            <div className={styles.meta}>
                                                {t.admin.refund.user}: {item.userId} • {t.admin.refund.requestDate}: {new Date(item.requestedAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className={styles.answerSection}>
                                            <div className={styles.answerForm}>
                                                <textarea
                                                    placeholder={t.admin.refund.rejectReason}
                                                    value={answerTexts[item.orderId] || ""}
                                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAnswerTexts(prev => ({ ...prev, [item.orderId]: e.target.value }))}
                                                />
                                                <div className={styles.actions}>
                                                    <button
                                                        className={styles.rejectBtn}
                                                        onClick={() => handleRefundReject(item.orderId)}
                                                    >
                                                        {t.admin.refund.reject}
                                                    </button>
                                                    <button onClick={() => handleRefundApprove(item.orderId)}>
                                                        {t.admin.refund.approve}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {refunds.length === 0 && <p className={styles.emptyMsg}>{t.admin.refund.empty}</p>}
                            </div>
                        )}

                        {activeTab === "gallery" && (
                            <div className={styles.list}>
                                <GalleryManagement />
                            </div>
                        )}
                        {activeTab === "brick-judge" && (
                            <div className="space-y-6 animate-fadeIn">
                                <BrickJudgeViewer />
                            </div>
                        )}
                    </main>
                </div>
            </div >
        </div >
    );
}
