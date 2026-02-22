'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import GalleryManagement from "@/components/admin/GalleryManagement";
import styles from "./AdminPage.module.css";
import AdminAIReport from "@/components/admin/AdminAIReport";
import { useAdminAI } from "@/hooks/useAdminAI";
import { useAdminData } from "@/hooks/useAdminData";

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
    const adminData = useAdminData(activeTab);

    // View States (Still here as they control UI visibility in the main page)
    const [traceJobId, setTraceJobId] = useState<string | null>(null);
    const [conclusionJobId, setConclusionJobId] = useState<string | null>(null);
    const [targetVerifyJobId, setTargetVerifyJobId] = useState<string | null>(null);

    return (
        <div className={styles.page}>
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

                        <div className="mt-auto pt-4 border-t border-[#333]">
                            <button
                                className={styles.sidebarItem}
                                onClick={() => router.push("/admin/detail")}
                                style={{ color: '#ffe135' }}
                            >
                                상세 관리 →
                            </button>
                        </div>
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
                        </header>

                        {activeTab === "dashboard" && (
                            <DashboardTab
                                t={t}
                                stats={adminData.stats}
                                aiState={aiState}
                                activeTab={activeTab}
                            />
                        )}

                        {activeTab === "jobs" && (
                            <JobsTab
                                t={t}
                                jobs={adminData.jobs}
                                userSearch={adminData.userSearch}
                                setUserSearch={adminData.setUserSearch}
                                filterStatus={adminData.filterStatus}
                                setFilterStatus={adminData.setFilterStatus}
                                reportedOnly={adminData.reportedOnly}
                                setReportedOnly={adminData.setReportedOnly}
                                fetchJobs={adminData.fetchJobs}
                                setTraceJobId={setTraceJobId}
                                setConclusionJobId={setConclusionJobId}
                                setTargetVerifyJobId={setTargetVerifyJobId}
                                setActiveTab={setActiveTab}
                                handleJobAction={adminData.handleJobAction}
                                jobPage={adminData.jobPage}
                                setJobPage={adminData.setJobPage}
                                jobTotalPages={adminData.jobTotalPages}
                            />
                        )}

                        {activeTab === "comments" && (
                            <CommentsTab
                                comments={adminData.comments}
                                fetchComments={adminData.fetchComments}
                                handleDeleteComment={adminData.handleDeleteComment}
                                commentPage={adminData.commentPage}
                                setCommentPage={adminData.setCommentPage}
                                commentTotalPages={adminData.commentTotalPages}
                            />
                        )}

                        {activeTab === "users" && (
                            <UsersTab
                                t={t}
                                users={adminData.users}
                                searchTerm={adminData.searchTerm}
                                setSearchTerm={adminData.setSearchTerm}
                                fetchUsers={adminData.fetchUsers}
                                handleUserSuspend={adminData.handleUserSuspend}
                                handleUserActivate={adminData.handleUserActivate}
                                handleUserRoleChange={adminData.handleUserRoleChange}
                            />
                        )}

                        {activeTab === "inquiries" && (
                            <InquiriesTab
                                t={t}
                                inquiries={adminData.inquiries}
                                answerTexts={adminData.answerTexts}
                                setAnswerTexts={adminData.setAnswerTexts}
                                handleAnswerSubmit={adminData.handleAnswerSubmit}
                            />
                        )}

                        {activeTab === "reports" && (
                            <ReportsTab
                                t={t}
                                reports={adminData.reports}
                                answerTexts={adminData.answerTexts}
                                setAnswerTexts={adminData.setAnswerTexts}
                                handleReportResolve={adminData.handleReportResolve}
                            />
                        )}

                        {activeTab === "refunds" && (
                            <RefundsTab
                                t={t}
                                refunds={adminData.refunds}
                                answerTexts={adminData.answerTexts}
                                setAnswerTexts={adminData.setAnswerTexts}
                                handleRefundApprove={adminData.handleRefundApprove}
                                handleRefundReject={adminData.handleRefundReject}
                            />
                        )}

                        {activeTab === "gallery" && (
                            <div className={styles.list}>
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


            {/* AI Report / Global Overlay */}
            <AdminAIReport aiState={aiState} activeTab={activeTab} />

            {traceJobId && (
                <AgentTraceViewer jobId={traceJobId} onClose={() => setTraceJobId(null)} />
            )}

            {conclusionJobId && (
                <AgentConclusionViewer jobId={conclusionJobId} onClose={() => setConclusionJobId(null)} />
            )}
        </div>
    );
}
