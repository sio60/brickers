import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import type { AdminStats } from "../../api/myApi";
import { useAuth } from "../Auth/AuthContext";
import "./AdminPage.css";
import Background3D from "../MainPage/components/Background3D";

// 타입 정의 추가
type Inquiry = {
    id: string;
    title: string;
    content: string;
    status: string;
    createdAt: string;
    userId: string;
    userEmail?: string; // ✅ 추가
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
    createdBy: string; // reporterId와 동일하지만 백엔드 필드명 확인 필요
    reporterEmail?: string; // ✅ 추가
    resolutionNote?: string;
};
type RefundRequest = { orderId: string; amount: number; status: string; requestedAt: string; userId: string };

export default function AdminPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { authFetch, myApi } = useAuth(); // ✅ myApi 추가
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
        myApi.getMyProfile() // ✅ myApi 사용
            .then(profile => {
                if (profile.role === "ADMIN") {
                    return myApi.getAdminStats(); // ✅ myApi 사용
                } else {
                    alert(t.admin.accessDenied.replace("{role}", profile.role));
                    navigate("/", { replace: true });
                }
            })
            .then(s => {
                if (s) {
                    setStats(s);
                    setLoading(false);
                }
            })
            .catch(() => {
                navigate("/", { replace: true });
            });
    }, [myApi]);

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
        } catch (e) { console.error(e); }
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
        } catch (e) { console.error(e); }
    };

    const fetchRefunds = async () => {
        try {
            const res = await authFetch("/api/admin/payments/refund-requests?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setRefunds(data.content || []);
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return null;

    return (
        <div className="adminPage">
            <Background3D entryDirection="float" />
            <div className="admin__container">
                <div className="admin__layout">
                    <aside className="admin__sidebar">
                        <div className="admin__sidebarTitle">{t.admin.panelTitle}</div>
                        <button className={`admin__sidebarItem ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>{t.admin.sidebar.dashboard}</button>
                        <button className={`admin__sidebarItem ${activeTab === "inquiries" ? "active" : ""}`} onClick={() => setActiveTab("inquiries")}>{t.admin.sidebar.inquiries}</button>
                        <button className={`admin__sidebarItem ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>{t.admin.sidebar.reports}</button>
                        <button className={`admin__sidebarItem ${activeTab === "refunds" ? "active" : ""}`} onClick={() => setActiveTab("refunds")}>{t.admin.sidebar.refunds}</button>
                        <button className={`admin__sidebarItem ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>{t.admin.sidebar.users}</button>
                        <button className={`admin__sidebarItem ${activeTab === "gallery" ? "active" : ""}`} onClick={() => setActiveTab("gallery")}>{t.admin.sidebar.gallery}</button>
                    </aside>

                    <main className="admin__content">
                        <header className="admin__header">
                            <h1 className="admin__title">
                                {activeTab === "dashboard" && t.floatingMenu.admin}
                                {activeTab === "inquiries" && t.admin.sidebar.inquiries}
                                {activeTab === "reports" && t.admin.sidebar.reports}
                                {activeTab === "refunds" && t.admin.sidebar.refunds}
                            </h1>
                            <button className="admin__closeBtn" onClick={() => navigate(-1)}>✕</button>
                        </header>

                        {activeTab === "dashboard" && (
                            <div className="admin__dashboard">
                                <p>{t.admin.welcome}</p>
                                <div className="admin__statsGrid">
                                    <div className="admin__statCard">
                                        <h3>{t.admin.stats.users}</h3>
                                        <p className="admin__statValue">{stats?.totalUsers ?? "--"}</p>
                                    </div>
                                    <div className="admin__statCard">
                                        <h3>{t.admin.stats.jobs}</h3>
                                        <p className="admin__statValue">{stats?.totalJobs ?? "--"}</p>
                                    </div>
                                    <div className="admin__statCard">
                                        <h3>{t.admin.stats.gallery}</h3>
                                        <p className="admin__statValue">{stats?.totalGalleryPosts ?? "--"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "inquiries" && (
                            <div className="admin__list">
                                {inquiries.map(item => (
                                    <div key={item.id} className="admin__listItem inquiry">
                                        <div className="inquiry__main">
                                            <h4>{item.title} <span className={`status-badge ${item.status}`}>{item.status}</span></h4>
                                            <p>{item.content}</p>
                                            <div className="meta">{item.userEmail || item.userId} • {new Date(item.createdAt).toLocaleDateString()}</div>
                                        </div>

                                        <div className="inquiry__answer-section">
                                            {item.answer ? (
                                                <div className="admin__answer active">
                                                    <div className="answer__label">{t.admin.inquiry.adminAnswer}</div>
                                                    <div className="answer__content">{item.answer.content}</div>
                                                    <div className="answer__date">{new Date(item.answer.answeredAt).toLocaleString()}</div>
                                                </div>
                                            ) : (
                                                <div className="answer__form">
                                                    <textarea
                                                        placeholder={t.admin.inquiry.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <button onClick={() => handleAnswerSubmit(item.id)}>{t.admin.inquiry.submit}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {inquiries.length === 0 && <p className="empty-msg">{t.admin.inquiry.empty}</p>}
                            </div>
                        )}

                        {activeTab === "reports" && (
                            <div className="admin__list">
                                {reports.map(item => (
                                    <div key={item.id} className="admin__listItem inquiry">
                                        <div className="inquiry__main">
                                            <h4>{item.reason} <span className={`status-badge ${item.status}`}>{item.status}</span></h4>
                                            <p>{item.details}</p>
                                            <div className="meta">
                                                Target: {item.targetType}({item.targetId}) •
                                                Reporter: {item.reporterEmail || item.createdBy} •
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="inquiry__answer-section">
                                            {item.status !== "PENDING" ? (
                                                <div className="admin__answer active">
                                                    <div className="answer__label">{item.status === "RESOLVED" ? t.admin.report.actionComplete : t.admin.report.actionRejected}</div>
                                                    <div className="answer__content">{item.resolutionNote}</div>
                                                </div>
                                            ) : (
                                                <div className="answer__form">
                                                    <textarea
                                                        placeholder={t.admin.report.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <div className="actions" style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleReportResolve(item.id, false)}
                                                            style={{ background: '#eee', color: '#000' }}
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
                                {reports.length === 0 && <p className="empty-msg">{t.admin.report.empty}</p>}
                            </div>
                        )}

                        {activeTab === "refunds" && (
                            <div className="admin__list">
                                {refunds.map(item => (
                                    <div key={item.orderId} className="admin__listItem">
                                        <h4>Order #{item.orderId} <span className={`status-badge ${item.status}`}>{item.status}</span></h4>
                                        <p>{t.admin.refund.amount}: {item.amount}</p>
                                        <div className="meta">User: {item.userId} • {new Date(item.requestedAt).toLocaleDateString()}</div>
                                        <div className="actions">
                                            <button onClick={() => alert(t.admin.refund.inProgress)}>{t.admin.refund.approve}</button>
                                        </div>
                                    </div>
                                ))}
                                {refunds.length === 0 && <p className="empty-msg">{t.admin.refund.empty}</p>}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
