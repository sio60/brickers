'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import GalleryManagement from "@/components/admin/GalleryManagement";
import AdminAIReport from "@/components/admin/AdminAIReport";
import { useAdminAI } from "@/hooks/useAdminAI";

import DashboardTab from "@/components/admin/DashboardTab";
import UsersTab from "@/components/admin/UsersTab";
import JobsTab from "@/components/admin/JobsTab";
import CommentsTab from "@/components/admin/CommentsTab";
import InquiriesTab from "@/components/admin/InquiriesTab";
import ReportsTab from "@/components/admin/ReportsTab";
import RefundsTab from "@/components/admin/RefundsTab";

// SSR 제외
const BrickJudgeViewer = dynamic(() => import("@/components/admin/BrickJudgeViewer"), { ssr: false });
const AgentTraceViewer = dynamic(() => import("@/components/admin/AgentTraceViewer"), { ssr: false });
const AgentConclusionViewer = dynamic(() => import("@/components/admin/AgentConclusionViewer"), { ssr: false });

export default function AdminPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge">("dashboard");

    const { ...aiState } = useAdminAI(activeTab);

    // View States (Still here as they control UI visibility in the main page)
    const [traceJobId, setTraceJobId] = useState<string | null>(null);
    const [conclusionJobId, setConclusionJobId] = useState<string | null>(null);
    const [targetVerifyJobId, setTargetVerifyJobId] = useState<string | null>(null);

    const sidebarItemBase = "py-4 px-8 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] max-md:py-3 max-md:px-4 max-md:whitespace-nowrap max-md:text-sm";
    const sidebarItemActive = "!text-black !bg-[#ffe135]";

    return (
        <div className="min-h-screen w-full relative pt-[72px] bg-white max-md:pt-[60px]">
            <div className="w-full max-w-none m-0 relative z-5 bg-white h-[calc(100vh-72px)] shadow-none border-none rounded-none overflow-hidden flex flex-col max-md:m-[10px] max-md:rounded-[20px] max-md:h-[calc(100vh-80px)]">
                <div className="flex-1 flex overflow-hidden max-md:flex-col">
                    <aside className="w-[240px] bg-black text-white flex flex-col py-10 px-0 max-md:w-full max-md:flex-row max-md:p-0 max-md:overflow-x-auto">
                        <div className="px-8 pb-6 text-xl font-black text-[#ffe135] border-b border-[#333] mb-6 max-md:hidden">{t.admin.panelTitle}</div>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "dashboard" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("dashboard")}
                        >
                            {t.admin.sidebar.dashboard}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "users" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("users")}
                        >
                            {t.admin.sidebar.users}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "jobs" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("jobs")}
                        >
                            {t.admin.sidebar.jobs || "All Jobs"}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "comments" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("comments")}
                        >
                            {t.admin.sidebar.comments}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "inquiries" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("inquiries")}
                        >
                            {t.admin.sidebar.inquiries}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "reports" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("reports")}
                        >
                            {t.admin.sidebar.reports}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "refunds" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("refunds")}
                        >
                            {t.admin.sidebar.refunds}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "gallery" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("gallery")}
                        >
                            {t.admin.sidebar.gallery}
                        </button>
                        <button
                            className={`${sidebarItemBase} ${activeTab === "brick-judge" ? sidebarItemActive : ""}`}
                            onClick={() => setActiveTab("brick-judge")}
                        >
                            {t.admin.brickJudge?.title || "Brick Judge"}
                        </button>

                        <div className="mt-auto pt-4 border-t border-[#333]">
                            <button
                                className={`${sidebarItemBase} text-[#ffe135]`}
                                onClick={() => router.push("/admin/detail")}
                            >
                                상세 관리 →
                            </button>
                        </div>
                    </aside>

                    <main className="flex-1 overflow-y-auto py-8 px-12 flex flex-col max-md:p-5">
                        <header className="flex items-center justify-between pb-5 border-b-2 border-[#eee] mb-8">
                            <h1 className="text-[28px] font-black m-0 text-black max-md:text-xl">
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
                        </header>

                        {activeTab === "dashboard" && (
                            <DashboardTab
                                aiState={aiState}
                                activeTab={activeTab}
                            />
                        )}

                        {activeTab === "jobs" && (
                            <JobsTab
                                setTraceJobId={setTraceJobId}
                                setConclusionJobId={setConclusionJobId}
                                setTargetVerifyJobId={setTargetVerifyJobId}
                                setActiveTab={setActiveTab}
                            />
                        )}

                        {activeTab === "comments" && (
                            <CommentsTab />
                        )}

                        {activeTab === "users" && (
                            <UsersTab />
                        )}

                        {activeTab === "inquiries" && (
                            <InquiriesTab />
                        )}

                        {activeTab === "reports" && (
                            <ReportsTab />
                        )}

                        {activeTab === "refunds" && (
                            <RefundsTab />
                        )}

                        {activeTab === "gallery" && (
                            <div className="flex flex-col border-t-2 border-black">
                                <GalleryManagement />
                            </div>
                        )}

                        {activeTab === "brick-judge" && (
                            <div className="space-y-6 animate-fadeIn">
                                <BrickJudgeViewer initialSelectedId={targetVerifyJobId || undefined} />
                            </div>
                        )}
                    </main>
                </div>
            </div>


            {traceJobId && (
                <AgentTraceViewer jobId={traceJobId} onClose={() => setTraceJobId(null)} />
            )}

            {conclusionJobId && (
                <AgentConclusionViewer jobId={conclusionJobId} onClose={() => setConclusionJobId(null)} />
            )}
        </div>
    );
}
