'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "../AdminPage.module.css";
import { useAdminAI } from "@/hooks/useAdminAI";
import { AdminDetailDataProvider } from "@/contexts/AdminDetailDataContext";

// SSR 제외 및 동적 임포트
const DetailedAnalytics = dynamic(() => import("@/components/admin/DetailedAnalytics"), { ssr: false });
const DeepInsights = dynamic(() => import("@/components/admin/DeepInsights"), { ssr: false });

export default function AdminDetailPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "propensity">("dashboard");

    // [NEW] Use shared hook
    const aiState = useAdminAI(activeTab);

    return (
        <AdminDetailDataProvider>
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.layout}>
                        <aside className={styles.sidebar}>
                            <div className={styles.sidebarTitle}>Admin Detail</div>
                            <button className={`${styles.sidebarItem} ${activeTab === "dashboard" ? styles.active : ""}`} onClick={() => setActiveTab("dashboard")}>상세 분석</button>
                            <button className={`${styles.sidebarItem} ${activeTab === "propensity" ? styles.active : ""}`} onClick={() => setActiveTab("propensity")}>유저 성향 분석</button>

                            <div className="mt-auto pt-4 border-t border-[#333]">
                                <button className={styles.sidebarItem} onClick={() => router.push('/admin')}>
                                    ← 관리자 홈
                                </button>
                            </div>
                        </aside>

                        <main className={styles.content}>
                            <header className={styles.header}>
                                <h1 className={styles.title}>
                                    {activeTab === "dashboard" ? "상세 분석 대시보드" : "유저 성향 분석"}
                                </h1>
                            </header>

                            <div className={styles.dashboard}>
                                {/* display:none 패턴 — 컴포넌트를 언마운트하지 않아 훅 순서 유지 + 데이터 보존 */}
                                <div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
                                    <DetailedAnalytics />
                                </div>
                                <div style={{ display: activeTab === "propensity" ? "block" : "none" }}>
                                    <DeepInsights />
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </AdminDetailDataProvider>
    );
}
