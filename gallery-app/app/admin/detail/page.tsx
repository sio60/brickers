'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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

    const sidebarItemBase = "py-4 px-8 border-none bg-transparent text-left text-base font-bold cursor-pointer transition-all duration-200 text-[#888] hover:text-white hover:bg-[#222] max-md:py-3 max-md:px-4 max-md:whitespace-nowrap max-md:text-sm";
    const sidebarItemActive = "!text-black !bg-[#ffe135]";

    return (
        <AdminDetailDataProvider>
            <div className="min-h-screen w-full relative pt-[72px] bg-white max-md:pt-[60px]">
                <div className="w-full max-w-none m-0 relative z-5 bg-white h-[calc(100vh-72px)] shadow-none border-none rounded-none overflow-hidden flex flex-col max-md:m-[10px] max-md:rounded-[20px] max-md:h-[calc(100vh-80px)]">
                    <div className="flex-1 flex overflow-hidden max-md:flex-col">
                        <aside className="w-[240px] bg-black text-white flex flex-col py-10 px-0 max-md:w-full max-md:flex-row max-md:p-0 max-md:overflow-x-auto">
                            <div className="px-8 pb-6 text-xl font-black text-[#ffe135] border-b border-[#333] mb-6 max-md:hidden">Admin Detail</div>
                            <button className={`${sidebarItemBase} ${activeTab === "dashboard" ? sidebarItemActive : ""}`} onClick={() => setActiveTab("dashboard")}>상세 분석</button>
                            <button className={`${sidebarItemBase} ${activeTab === "propensity" ? sidebarItemActive : ""}`} onClick={() => setActiveTab("propensity")}>유저 성향 분석</button>

                            <div className="mt-auto pt-4 border-t border-[#333]">
                                <button className={sidebarItemBase} onClick={() => router.push('/admin')}>
                                    ← 관리자 홈
                                </button>
                            </div>
                        </aside>

                        <main className="flex-1 overflow-y-auto py-8 px-12 flex flex-col max-md:p-5">
                            <header className="flex items-center justify-between pb-5 border-b-2 border-[#eee] mb-8">
                                <h1 className="text-[28px] font-black m-0 text-black max-md:text-xl">
                                    {activeTab === "dashboard" ? "상세 분석 대시보드" : "유저 성향 분석"}
                                </h1>
                            </header>

                            <div className="text-[#444]">
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
