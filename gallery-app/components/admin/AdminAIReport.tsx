import React, { useState } from "react";
import { useAdminAI } from "@/hooks/useAdminAI";
import { renderMarkdown } from "@/lib/markdownUtils";

interface AdminAIReportProps {
    activeTab?: string;
    customContent?: string; // ✅ [NEW] 커스텀 질문 결과 렌더링용
}

export default function AdminAIReport({ activeTab, customContent }: AdminAIReportProps) {
    const {
        handleDeepAnalyze,
        handleRestore,
        deepAnalyzing,
        deepReport,
        deepRisk,
        deepError,
        lastDeepAnalysisTime,
        moderationResults
    } = useAdminAI(activeTab || "dashboard");

    const [report, setReport] = useState<string | null>(customContent || null); // ✅ customContent 우선 사용
    const [loading, setLoading] = useState(!customContent);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    if (activeTab && activeTab !== "dashboard" && !customContent) return null;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header 섹션 */}
            <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </span>
                        AI Analytics Dashboard
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        LangGraph 기반 실시간 지표 분석 및 이상 탐지
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {lastDeepAnalysisTime && (
                        <span className="text-xs text-gray-400">
                            Last update: {lastDeepAnalysisTime}
                        </span>
                    )}
                    <button
                        onClick={handleDeepAnalyze}
                        disabled={deepAnalyzing}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                            ${deepAnalyzing
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                            }`}
                    >
                        {deepAnalyzing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                분석 중...
                            </>
                        ) : '분석 시작'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 메인 리포트 섹션 */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
                            <span className="text-indigo-600 italic font-medium">Report</span>
                        </div>
                        <div className="p-6 h-[600px] overflow-y-auto custom-scrollbar">
                            {deepError ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <p className="text-red-600 dark:text-red-400 font-medium">{deepError}</p>
                                </div>
                            ) : deepReport ? (
                                <div
                                    className="prose dark:prose-invert max-w-none prose-indigo prose-sm sm:prose-base h-full"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(deepReport) }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                    <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p>심층 분석 보고서가 여기에 표시됩니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* [NEW] 자율 콘텐츠 검열 리뷰 섹션 */}
                    {moderationResults && moderationResults.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                                <span className="text-indigo-600 italic font-medium flex items-center gap-2">
                                    🛡️ Content Moderation Review
                                </span>
                                <span className="text-xs text-gray-400 whitespace-nowrap">AI가 자동으로 숨긴 항목입니다.</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Reason</th>
                                            <th className="px-6 py-3">Confidence</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {moderationResults.map((res: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${res.type === 'POST' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                        {res.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px] truncate" title={res.reason}>
                                                    {res.reason}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${res.confidence * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 mt-1">{(res.confidence * 100).toFixed(0)}%</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-medium ${res.action_taken === 'HIDDEN' ? 'text-red-500' : 'text-green-500'}`}>
                                                        {res.action_taken}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap font-medium">
                                                    <a
                                                        href={res.type === 'POST' ? `/gallery/${res.target_id}` : `/gallery/${res.post_id || res.target_id}`}
                                                        target="_blank"
                                                        className="text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        View
                                                    </a>
                                                    {res.action_taken === 'HIDDEN' && (
                                                        <button
                                                            onClick={() => handleRestore(res.type, res.target_id)}
                                                            className="text-indigo-600 hover:text-white px-2 py-1 bg-indigo-50 hover:bg-indigo-600 rounded transition-colors"
                                                        >
                                                            Restore
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* 사이드바 사이드 섹션 (Risk Score 등) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Service Risk Score</h3>
                        <div className="flex flex-col items-center py-4">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="text-gray-200 dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path
                                        className={`transition-all duration-1000 ${deepRisk > 0.6 ? 'text-red-500' : deepRisk > 0.3 ? 'text-yellow-500' : 'text-green-500'}`}
                                        strokeDasharray={`${deepRisk * 100}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{(deepRisk * 100).toFixed(0)}</span>
                                    <span className="text-xs text-gray-400 block">%</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-gray-500 text-center px-4">
                                통계적 이상치와 AI 진단을 종합한 실시간 위험 지수입니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
