// [NEW] 에이전트 작업 전/후 성능 비교 뷰어
"use client";

import React, { useEffect, useState } from "react";

interface AgentTrace {
    id: string;
    nodeName: string;
    status: string;
    input: any;
    output: any;
    createdAt: string;
}

interface Metrics {
    stability_score: number;
    total_bricks: number;
    floating_count: number;
    isolated_count: number;
}

interface AgentConclusionViewerProps {
    jobId: string;
    onClose: () => void;
}

export default function AgentConclusionViewer({ jobId, onClose }: AgentConclusionViewerProps) {
    const [loading, setLoading] = useState(true);
    const [beforeMetrics, setBeforeMetrics] = useState<Metrics | null>(null);
    const [afterMetrics, setAfterMetrics] = useState<Metrics | null>(null);
    const [finalReport, setFinalReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/kids/jobs/${jobId}/traces`);
                if (!res.ok) throw new Error("Failed to fetch trace data");

                const traces: AgentTrace[] = await res.json();

                // 1. Before Metrics (첫 번째 verifier 노드 결과)
                // backend에서는 'node_verifier'로 기록될 수 있으므로 둘 다 체크
                const verifierTraces = traces.filter(t => t.nodeName === "verifier" || t.nodeName === "node_verifier");

                if (verifierTraces.length > 0) {
                    const firstVerifier = verifierTraces[0];
                    setBeforeMetrics(extractMetrics(firstVerifier.output));

                    // 2. After Metrics (마지막 verifier 노드 결과)
                    const lastVerifier = verifierTraces[verifierTraces.length - 1];
                    setAfterMetrics(extractMetrics(lastVerifier.output));
                }

                // 3. Final Report 탐색 (end 노드 또는 최종 리포트가 포함된 노드)
                const endNode = traces.find(t => t.nodeName === "end" || t.nodeName === "__end__" || t.output?.final_report);
                if (endNode) {
                    setFinalReport(endNode.output?.final_report || endNode.output);
                }

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [jobId]);

    const extractMetrics = (output: any): Metrics | null => {
        const metrics = output?.current_metrics || output?.final_report?.final_metrics;
        if (!metrics) return null;
        return {
            stability_score: metrics.stability_score ?? 0,
            total_bricks: metrics.total_bricks ?? 0,
            floating_count: metrics.floating_count ?? 0,
            isolated_count: metrics.isolated_count ?? 0
        };
    };

    const MetricCard = ({ label, before, after, isScore = false }: { label: string, before: number, after: number, isScore?: boolean }) => {
        const diff = after - before;
        const isImproved = isScore ? diff > 0 : diff < 0;
        const colorClass = diff === 0 ? "text-gray-500" : (isImproved ? "text-green-600" : "text-red-600");

        return (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</div>
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-[10px] text-gray-400">Before</div>
                            <div className="text-lg font-bold text-gray-700">{before}{isScore ? '점' : ''}</div>
                        </div>
                        <div className="text-gray-300">→</div>
                        <div className="text-center">
                            <div className="text-[10px] text-gray-400">After</div>
                            <div className="text-lg font-bold text-gray-900">{after}{isScore ? '점' : ''}</div>
                        </div>
                    </div>
                    <div className={`text-sm font-black ${colorClass}`}>
                        {diff > 0 ? '+' : ''}{diff} {isImproved ? '▲' : '▼'}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#f8f9fa] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-6 bg-white border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Performance Conclusion</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">에이전트 작업 전/후 지표 비교</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <span className="text-gray-400 text-xl">✕</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 font-medium animate-pulse">데이터를 분석하고 있습니다...</div>
                    ) : error ? (
                        <div className="py-20 text-center text-red-500 font-bold">{error}</div>
                    ) : !beforeMetrics ? (
                        <div className="py-20 text-center text-gray-400 font-medium">검증 데이터가 충분하지 않습니다.</div>
                    ) : (
                        <>
                            {/* Summary Banner */}
                            <div className={`p-5 rounded-2xl flex items-center justify-between border-2 ${finalReport?.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                <div>
                                    <div className={`text-sm font-black ${finalReport?.success ? 'text-green-700' : 'text-red-700'}`}>
                                        {finalReport?.success ? "SUCCESS" : "FAILED"}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        총 시도: <span className="font-bold text-gray-900">{finalReport?.total_attempts}회</span> |
                                        메시지: <span className="font-medium text-gray-700">{finalReport?.message || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="text-3xl">
                                    {finalReport?.success ? "🎉" : "⚠️"}
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <MetricCard
                                    label="안정성 점수"
                                    before={beforeMetrics.stability_score}
                                    after={afterMetrics?.stability_score || 0}
                                    isScore
                                />
                                <MetricCard
                                    label="총 브릭 개수"
                                    before={beforeMetrics.total_bricks}
                                    after={afterMetrics?.total_bricks || 0}
                                />
                                <MetricCard
                                    label="공중부양 브릭"
                                    before={beforeMetrics.floating_count}
                                    after={afterMetrics?.floating_count || 0}
                                />
                                <MetricCard
                                    label="고립된 브릭"
                                    before={beforeMetrics.isolated_count}
                                    after={afterMetrics?.isolated_count || 0}
                                />
                            </div>

                            {/* Tool Usage */}
                            {finalReport?.tool_usage && Object.keys(finalReport.tool_usage).length > 0 && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-100">
                                    <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                        Strategy Tool Usage
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(finalReport.tool_usage).map(([tool, count]: [string, any]) => (
                                            <div key={tool} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100">
                                                {tool}: {count}회
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-black text-white rounded-xl font-black hover:bg-gray-900 transition-all active:scale-95 shadow-lg">
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
