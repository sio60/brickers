'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "../AdminPage.module.css"; // 경로 수정
import AdminAIReport from "@/components/admin/AdminAIReport";
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
    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge">("dashboard");

    // [NEW] Use shared hook
    const aiState = useAdminAI(activeTab);

    // 데이터 상태 및 핸들러는 기존 AdminPage와 동일하게 유지
    // ... (중략 - 실구현 시에는 모든 로직 포함)

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

            <div className={styles.container}>
                <div className={styles.layout}>
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarTitle}>Admin Detail</div>
                        <button className={`${styles.sidebarItem} ${activeTab === "dashboard" ? styles.active : ""}`} onClick={() => setActiveTab("dashboard")}>상세 분석</button>

                        <div className="mt-auto pt-4 border-t border-[#333]">
                            <button className={styles.sidebarItem} onClick={() => router.back()}>
                                ← 돌아가기
                            </button>
                        </div>
                    </aside>

                    <main className={styles.content}>
                        <header className={styles.header}>
                            <h1 className={styles.title}>상세 관리 대시보드</h1>
                            <button className={styles.closeBtn} onClick={() => router.back()}>✕</button>
                        </header>

                        <div className={styles.dashboard}>
                            <div className="bg-[#f8f9fa] border-2 border-black p-8 rounded-[32px] mb-8 shadow-sm">
                                <h1 className="text-2xl font-black mb-3">Admin Intel-Query</h1>
                                <p className="font-bold text-gray-800">지표에 대해 궁금한 점을 물어보세요. AI가 실시간 데이터를 분석하여 보고서를 작성합니다.</p>

                                <div className="mt-8 flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="예: 최근 유저들이 가장 많이 이탈하는 구간과 이유를 분석해줘"
                                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-black font-medium focus:outline-none focus:ring-4 focus:ring-[#ffe135]/30 transition-all"
                                        id="adminQueryInput"
                                        onKeyPress={(e) => e.key === 'Enter' && aiState.handleQuerySubmit((e.target as HTMLInputElement).value)}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('adminQueryInput') as HTMLInputElement;
                                            aiState.handleQuerySubmit(input.value);
                                        }}
                                        disabled={aiState.isQuerying}
                                        className="px-8 py-4 bg-black text-[#ffe135] rounded-2xl font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {aiState.isQuerying ? "분석 중..." : "질문하기"}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-black p-8 rounded-[32px] animate-fadeIn shadow-xl">
                                <AdminAIReport aiState={aiState} activeTab="dashboard" />
                            </div>

                            {!aiState.isQuerying && (
                                <div className="text-center py-10 opacity-30 select-none">
                                    <p className="text-4xl mb-2">💬</p>
                                    <p className="font-black text-sm">추가 질문이나 분석이 필요하시면 위 입력창을 이용해주세요.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}


