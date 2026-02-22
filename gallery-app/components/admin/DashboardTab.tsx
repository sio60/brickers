import React from "react";
import AdminAIReport from "./AdminAIReport";

interface DashboardTabProps {
    t: any;
    stats: any;
    aiState: {
        isQuerying: boolean;
        handleQuerySubmit: (query: string) => void;
        [key: string]: any;
    };
    activeTab: string;
}

export default function DashboardTab({ t, stats, aiState, activeTab }: DashboardTabProps) {
    return (
        <div className="flex flex-col gap-6">
            <p className="text-gray-600 font-medium">{t.admin.welcome}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.users}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalUsers ?? "--"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.jobs}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalJobs ?? "--"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.gallery}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalGalleryPosts ?? "--"}</p>
                </div>
            </div>

            {/* Admin Intel-Query UI */}
            <div className="bg-[#f8f9fa] border-2 border-[#eee] p-10 rounded-[40px] mt-12 mb-12">
                <h1 className="text-2xl font-black mb-3">Admin Intel-Query</h1>
                <p className="font-bold text-gray-800">지표에 대해 궁금한 점을 물어보세요. AI가 실시간 데이터를 분석하여 보고서를 작성합니다.</p>

                <div className="mt-8 flex gap-3">
                    <input
                        type="text"
                        placeholder="예: 최근 유저들이 가장 많이 이탈하는 구간과 이유를 분석해줘"
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-[#eee] font-medium focus:outline-none focus:border-[#ffe135] focus:ring-4 focus:ring-[#ffe135]/10 transition-all bg-white"
                        id="adminQueryInputMain"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                aiState.handleQuerySubmit((e.target as HTMLInputElement).value);
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            const input = document.getElementById('adminQueryInputMain') as HTMLInputElement;
                            if (input) aiState.handleQuerySubmit(input.value);
                        }}
                        disabled={aiState.isQuerying}
                        className="px-8 py-4 bg-black text-[#ffe135] rounded-2xl font-black hover:bg-[#222] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {aiState.isQuerying ? "분석 중..." : "질문하기"}
                    </button>
                </div>
            </div>

            {aiState.isQuerying && (
                <div className="flex items-center justify-center p-8 text-gray-400 bg-gray-50 rounded-2xl animate-pulse mb-8 border-2 border-dashed border-[#ffe135]/30">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AI가 실시간 데이터를 분석하여 보고서 하단에 답변을 작성 중입니다...
                </div>
            )}

        </div>
    );
}
