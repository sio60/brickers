'use client';

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, getAdminStats, AdminStats } from "@/lib/api/myApi";
import GalleryManagement from "@/components/admin/GalleryManagement";
import styles from "../AdminPage.module.css"; // 경로 수정
import AdminAIReport from "@/components/admin/AdminAIReport";
import { useAdminAI } from "@/hooks/useAdminAI";

// SSR 제외
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });
const BrickJudgeViewer = dynamic(() => import("@/components/admin/BrickJudgeViewer"), { ssr: false });

// 타 메인 페이지와 동일한 타입 및 로직 유지 (사용자 요청에 따라 UI 복제)
type Inquiry = { id: string; title: string; content: string; status: string; createdAt: string; userId: string; userEmail?: string; answer?: { content: string; answeredAt: string; } };
type Report = { id: string; targetType: string; targetId: string; reason: string; details: string; status: string; createdAt: string; createdBy: string; reporterEmail?: string; resolutionNote?: string; };
type RefundRequest = { id: string; orderId: string; orderNo: string; amount: number; status: string; requestedAt: string; userId: string; itemName?: string; cancelReason?: string; createdAt: string; updatedAt: string; };
type User = { id: string; email: string; nickname: string; profileImage?: string; role: string; membershipPlan: string; accountState: string; createdAt: string; lastLoginAt?: string; suspendedAt?: string; suspendedReason?: string; };
type AdminJob = { id: string; userId: string; userInfo?: { id: string; email: string; nickname: string; }; title: string; status: string; stage: string; sourceImageUrl?: string; previewImageUrl?: string; createdAt: string; updatedAt: string; errorMessage?: string; };
type Comment = { id: string; postId: string; authorId: string; authorNickname: string; content: string; deleted: boolean; createdAt: string; updatedAt: string; };

export default function AdminDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge">("dashboard");

    // [NEW] Use shared hook
    const { queryResult, isQuerying, handleQuerySubmit } = useAdminAI(activeTab);

    // 데이터 상태 및 핸들러는 기존 AdminPage와 동일하게 유지
    // ... (중략 - 실구현 시에는 모든 로직 포함)

    useEffect(() => {
        getMyProfile()
            .then(profile => {
                if (profile.role === "ADMIN") return getAdminStats();
                else router.replace("/");
            })
            .then(s => {
                if (s) { setStats(s); setLoading(false); }
            })
            .catch(() => router.replace("/"));
    }, [router]);

    if (loading) return null;

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
                                        onKeyPress={(e) => e.key === 'Enter' && handleQuerySubmit((e.target as HTMLInputElement).value)}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('adminQueryInput') as HTMLInputElement;
                                            handleQuerySubmit(input.value);
                                        }}
                                        disabled={isQuerying}
                                        className="px-8 py-4 bg-black text-[#ffe135] rounded-2xl font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isQuerying ? "분석 중..." : "질문하기"}
                                    </button>
                                </div>
                            </div>

                            {queryResult && (
                                <div className="bg-white border-2 border-black p-8 rounded-[32px] animate-fadeIn shadow-xl">
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-dashed border-gray-100">
                                        <h2 className="text-xl font-black">📊 AI 분석 결과</h2>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full">REAL-TIME DATA APPED</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <AdminAIReport customContent={queryResult} activeTab="dashboard" />
                                    </div>
                                </div>
                            )}

                            {!queryResult && !isQuerying && (
                                <div className="text-center py-20 opacity-30 select-none">
                                    <p className="text-6xl mb-4">💬</p>
                                    <p className="font-black text-xl">질문을 기다리고 있습니다.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}


