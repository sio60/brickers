'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, getAdminStats, AdminStats } from "@/lib/api/myApi";
import styles from "./AdminPage.module.css";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

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
    createdAt?: string;
    updatedAt?: string;
};

export default function AdminPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "gallery" | "inquiries" | "reports" | "refunds">("dashboard");

    // 데이터 상태
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);

    // 답변 입력 상태
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

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
    }, [activeTab]);

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
                            className={`${styles.sidebarItem} ${activeTab === "users" ? styles.active : ""}`}
                            onClick={() => setActiveTab("users")}
                        >
                            {t.admin.sidebar.users}
                        </button>
                        <button
                            className={`${styles.sidebarItem} ${activeTab === "gallery" ? styles.active : ""}`}
                            onClick={() => setActiveTab("gallery")}
                        >
                            {t.admin.sidebar.gallery}
                        </button>
                    </aside>

                    <main className={styles.content}>
                        <header className={styles.header}>
                            <h1 className={styles.title}>
                                {activeTab === "dashboard" && t.floatingMenu.admin}
                                {activeTab === "inquiries" && t.admin.sidebar.inquiries}
                                {activeTab === "reports" && t.admin.sidebar.reports}
                                {activeTab === "refunds" && t.admin.sidebar.refunds}
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
                                                    onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.orderId]: e.target.value }))}
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
                    </main>
                </div>
            </div>
        </div>
    );
}
