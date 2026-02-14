'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "../AdminPage.module.css"; // 경로 수정
import DetailedAnalytics from "@/components/admin/DetailedAnalytics";
import DeepInsights from "@/components/admin/DeepInsights";
import { useAdminAI } from "@/hooks/useAdminAI";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

// 타 메인 페이지와 동일한 타입 및 로직 유지 (사용자 요청에 따라 UI 복제)
type Inquiry = { id: string; title: string; content: string; status: string; createdAt: string; userId: string; userEmail?: string; answer?: { content: string; answeredAt: string; } };
type Report = { id: string; targetType: string; targetId: string; reason: string; details: string; status: string; createdAt: string; createdBy: string; reporterEmail?: string; resolutionNote?: string; };
type RefundRequest = { id: string; orderId: string; orderNo: string; amount: number; status: string; requestedAt: string; userId: string; itemName?: string; cancelReason?: string; createdAt: string; updatedAt: string; };
type User = { id: string; email: string; nickname: string; profileImage?: string; role: string; membershipPlan: string; accountState: string; createdAt: string; lastLoginAt?: string; suspendedAt?: string; suspendedReason?: string; };
type AdminJob = { id: string; userId: string; userInfo?: { id: string; email: string; nickname: string; }; title: string; status: string; stage: string; sourceImageUrl?: string; previewImageUrl?: string; createdAt: string; updatedAt: string; errorMessage?: string; };
type Comment = { id: string; postId: string; authorId: string; authorNickname: string; content: string; deleted: boolean; createdAt: string; updatedAt: string; };

export default function AdminDetailPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "propensity" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge">("dashboard");
    const exitToMain = () => router.push("/");

    // [NEW] Use shared hook
    const aiState = useAdminAI(activeTab);

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

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
                            <button className={styles.closeBtn} onClick={() => router.push('/admin')}>✕</button>
                        </header>

                        <div className={styles.dashboard}>
                            {/* Detailed Analytics Component */}
                            {activeTab === "dashboard" && <DetailedAnalytics />}

                            {/* Deep Insights Component */}
                            {activeTab === "propensity" && <DeepInsights />}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}


