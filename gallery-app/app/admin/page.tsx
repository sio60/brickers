'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, getAdminStats, AdminStats } from "@/lib/api/myApi";
// import styles from "./AdminPage.module.css"; // Removed

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
    orderId: string;
    amount: number;
    status: string;
    requestedAt: string;
    userId: string;
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
                setRefunds(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen w-full relative pt-20 md:pt-[60px]">
            <Background3D entryDirection="float" />

            <div className="max-w-[1200px] mx-auto my-5 relative z-[5] bg-white/95 backdrop-blur-[20px] rounded-[40px] h-[80vh] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-[3px] border-black overflow-hidden flex flex-col md:m-[10px] md:h-[calc(100vh-80px)] md:rounded-[20px]">
                <div className="flex-1 flex overflow-hidden md:flex-col">
                    <aside className="w-[240px] bg-black text-white flex flex-col py-10 md:w-full md:flex-row md:p-0 md:overflow-x-auto">
                        <div className="px-8 pb-6 text-xl font-black text-[#ffe135] border-b border-[#333] mb-6 md:hidden">{t.admin.panelTitle}</div>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "dashboard" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("dashboard")}
                        >
                            {t.admin.sidebar.dashboard}
                        </button>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "inquiries" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("inquiries")}
                        >
                            {t.admin.sidebar.inquiries}
                        </button>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "reports" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("reports")}
                        >
                            {t.admin.sidebar.reports}
                        </button>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "refunds" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("refunds")}
                        >
                            {t.admin.sidebar.refunds}
                        </button>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "users" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("users")}
                        >
                            {t.admin.sidebar.users}
                        </button>
                        <button
                            className={`px-8 py-4 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] md:px-4 md:py-3 md:whitespace-nowrap md:text-sm ${activeTab === "gallery" ? "text-black bg-[#ffe135]" : ""}`}
                            onClick={() => setActiveTab("gallery")}
                        >
                            {t.admin.sidebar.gallery}
                        </button>
                    </aside>

                    <main className="flex-1 overflow-y-auto p-[32px_48px] flex flex-col md:p-5">
                        <header className="flex items-center justify-between pb-5 border-b-2 border-[#eee] mb-8">
                            <h1 className="text-3xl font-black m-0 text-black md:text-xl">
                                {activeTab === "dashboard" && t.floatingMenu.admin}
                                {activeTab === "inquiries" && t.admin.sidebar.inquiries}
                                {activeTab === "reports" && t.admin.sidebar.reports}
                                {activeTab === "refunds" && t.admin.sidebar.refunds}
                            </h1>
                            <button className="w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={() => router.back()}>✕</button>
                        </header>

                        {activeTab === "dashboard" && (
                            <div className="text-[#444]">
                                <p>{t.admin.welcome}</p>
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mt-8 md:grid-cols-1">
                                    <div className="bg-[#f8f9fa] p-6 rounded-[20px] border-2 border-[#eee]">
                                        <h3 className="m-[0_0_12px] text-[15px] font-extrabold text-[#888]">{t.admin.stats.users}</h3>
                                        <p className="text-[32px] font-[950] m-0 text-black">{stats?.totalUsers ?? "--"}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] p-6 rounded-[20px] border-2 border-[#eee]">
                                        <h3 className="m-[0_0_12px] text-[15px] font-extrabold text-[#888]">{t.admin.stats.jobs}</h3>
                                        <p className="text-[32px] font-[950] m-0 text-black">{stats?.totalJobs ?? "--"}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] p-6 rounded-[20px] border-2 border-[#eee]">
                                        <h3 className="m-[0_0_12px] text-[15px] font-extrabold text-[#888]">{t.admin.stats.gallery}</h3>
                                        <p className="text-[32px] font-[950] m-0 text-black">{stats?.totalGalleryPosts ?? "--"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "inquiries" && (
                            <div className="flex flex-col border-t-2 border-black">
                                {inquiries.map(item => (
                                    <div key={item.id} className="flex flex-col gap-4 p-[24px_8px] bg-white rounded-none border-b border-[#eee] transition-colors duration-200 hover:bg-[#fcfcfc]">
                                        <div>
                                            <h4 className="m-[0_0_12px] flex items-center justify-between text-base font-extrabold">
                                                {item.title}
                                                <span className={`px-3 py-1 rounded text-[11px] font-extrabold uppercase border border-black ${item.status === 'ANSWERED' || item.status === 'RESOLVED' ? "bg-black text-white" : "bg-white text-black"}`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p className="text-sm leading-relaxed text-[#444] m-0">{item.content}</p>
                                            <div className="text-xs text-[#999] mt-2">
                                                {item.userEmail || item.userId} • {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-0 border-t border-dashed border-[#eee]">
                                            {item.answer ? (
                                                <div className="bg-transparent p-[16px_0_0_20px] rounded-none border-none relative before:content-['↳'] before:absolute before:left-0 before:top-4 before:text-lg before:text-black before:font-bold">
                                                    <div className="text-[10px] font-black text-black bg-transparent border border-black inline-block px-2 py-[2px] rounded mb-2">{t.admin.inquiry.adminAnswer}</div>
                                                    <div className="text-sm leading-relaxed text-black font-normal">{item.answer.content}</div>
                                                    <div className="text-[11px] text-[#999] mt-2 text-right">
                                                        {new Date(item.answer.answeredAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <textarea
                                                        className="w-full min-h-[100px] p-3 rounded-xl border border-black font-inherit text-sm resize-none bg-white focus:outline-none focus:shadow-none focus:border-[#ffe135]"
                                                        placeholder={t.admin.inquiry.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <button
                                                        className="self-end p-[10px_24px] bg-black text-white border-none rounded-lg text-[13px] font-extrabold cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#ffe135] hover:text-black"
                                                        onClick={() => handleAnswerSubmit(item.id)}
                                                    >
                                                        {t.admin.inquiry.submit}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {inquiries.length === 0 && <p className="text-center text-[#999] p-10 text-sm">{t.admin.inquiry.empty}</p>}
                            </div>
                        )}

                        {activeTab === "reports" && (
                            <div className="flex flex-col border-t-2 border-black">
                                {reports.map(item => (
                                    <div key={item.id} className="flex flex-col gap-4 p-[24px_8px] bg-white rounded-none border-b border-[#eee] transition-colors duration-200 hover:bg-[#fcfcfc]">
                                        <div>
                                            <h4 className="m-[0_0_12px] flex items-center justify-between text-base font-extrabold">
                                                {item.reason}
                                                <span className={`px-3 py-1 rounded text-[11px] font-extrabold uppercase border border-black ${item.status === 'RESOLVED' ? "bg-black text-white" : item.status === 'REJECTED' ? "bg-[#eee] text-[#666] border-[#ddd]" : "bg-white text-black"}`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p className="text-sm leading-relaxed text-[#444] m-0">{item.details}</p>
                                            <div className="text-xs text-[#999] mt-2">
                                                {t.admin.label.target}: {item.targetType}({item.targetId}) •
                                                {t.admin.label.reporter}: {item.reporterEmail || item.createdBy} •
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-0 border-t border-dashed border-[#eee]">
                                            {item.status !== "PENDING" ? (
                                                <div className="bg-transparent p-[16px_0_0_20px] rounded-none border-none relative before:content-['↳'] before:absolute before:left-0 before:top-4 before:text-lg before:text-black before:font-bold">
                                                    <div className="text-[10px] font-black text-black bg-transparent border border-black inline-block px-2 py-[2px] rounded mb-2">
                                                        {item.status === "RESOLVED" ? t.admin.report.actionComplete : t.admin.report.actionRejected}
                                                    </div>
                                                    <div className="text-sm leading-relaxed text-black font-normal">{item.resolutionNote}</div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <textarea
                                                        className="w-full min-h-[100px] p-3 rounded-xl border border-black font-inherit text-sm resize-none bg-white focus:outline-none focus:shadow-none focus:border-[#ffe135]"
                                                        placeholder={t.admin.report.placeholder}
                                                        value={answerTexts[item.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    />
                                                    <div className="flex gap-2 self-end">
                                                        <button
                                                            className="self-end p-[10px_24px] rounded-lg text-[13px] font-extrabold cursor-pointer transition-all duration-200 hover:-translate-y-[2px] !bg-[#eee] !text-black border-none hover:bg-[#e0e0e0]"
                                                            onClick={() => handleReportResolve(item.id, false)}
                                                        >
                                                            {t.admin.report.reject}
                                                        </button>
                                                        <button
                                                            className="self-end p-[10px_24px] bg-black text-white border-none rounded-lg text-[13px] font-extrabold cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#ffe135] hover:text-black"
                                                            onClick={() => handleReportResolve(item.id, true)}
                                                        >
                                                            {t.admin.report.resolve}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {reports.length === 0 && <p className="text-center text-[#999] p-10 text-sm">{t.admin.report.empty}</p>}
                            </div>
                        )}

                        {activeTab === "refunds" && (
                            <div className="flex flex-col border-t-2 border-black">
                                {refunds.map(item => (
                                    <div key={item.orderId} className="flex flex-col gap-4 p-[24px_8px] bg-white rounded-none border-b border-[#eee] transition-colors duration-200 hover:bg-[#fcfcfc]">
                                        <h4 className="m-[0_0_12px] flex items-center justify-between text-base font-extrabold">
                                            {t.admin.label.order} #{item.orderId}
                                            <span className={`px-3 py-1 rounded text-[11px] font-extrabold uppercase border border-black ${item.status === 'RESOLVED' || item.status === 'APPROVED' ? "bg-black text-white" : item.status === 'REJECTED' ? "bg-[#eee] text-[#666] border-[#ddd]" : "bg-white text-black"}`}>
                                                {item.status}
                                            </span>
                                        </h4>
                                        <p className="text-sm leading-relaxed text-[#444] m-0">{t.admin.refund.amount}: {item.amount}</p>
                                        <div className="text-xs text-[#999] mt-2">
                                            {t.admin.label.user}: {item.userId} • {new Date(item.requestedAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex gap-2 self-end">
                                            <button
                                                className="self-end p-[10px_24px] bg-black text-white border-none rounded-lg text-[13px] font-extrabold cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#ffe135] hover:text-black"
                                                onClick={() => alert(t.admin.refund.inProgress)}
                                            >
                                                {t.admin.refund.approve}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {refunds.length === 0 && <p className="text-center text-[#999] p-10 text-sm">{t.admin.refund.empty}</p>}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
