// 에이전트 작업 전/후 성능 비교 + 파이프라인 요약 뷰어
"use client";

import React, { useEffect, useState } from "react";
import { MetricCard } from "./conclusion/MetricCard";
import { Timeline } from "./conclusion/Timeline";
import { CoScientistInfo } from "./conclusion/CoScientistInfo";
import { PipelineSummaryBanner } from "./conclusion/PipelineSummaryBanner";

interface AgentTrace {
    id: string;
    nodeName: string;
    status: string;
    input: any;
    output: any;
    durationMs?: number;
    createdAt: string;
}

interface Metrics {
    stability_score: number;
    total_bricks: number;
    floating_count: number;
    isolated_count: number;
}

// 파이프라인 요약 데이터 타입
interface PipelineStep {
    name: string;
    duration_sec: number;
    status: string;
    detail: string;
}

interface PipelineSummary {
    subject: string;
    age: string;
    budget: number;
    engine: string;
    total_time_sec: number;
    steps: PipelineStep[];
    result: {
        parts: number;
        final_target: number;
        ldr_size_kb: number;
        bom_unique_parts: number;
        est_cost?: number; // [NEW]
        token_count?: number; // [NEW]
    };
    coscientist?: {
        success: boolean;
        total_attempts: number;
        message: string;
        tool_usage: Record<string, number>;
    };
}

interface AgentConclusionViewerProps {
    jobId: string;
    onClose: () => void;
    finalLdrUrl?: string; // [NEW]
}

export default function AgentConclusionViewer({ jobId, onClose, finalLdrUrl }: AgentConclusionViewerProps) {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [finalReport, setFinalReport] = useState<any>(null);
    const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/kids/jobs/${jobId}/traces`);
                if (!res.ok) throw new Error("Failed to fetch trace data");

                const traces: AgentTrace[] = await res.json();

                // 1. PipelineSummary 트레이스 찾기
                const summaryTrace = traces.find(t => t.nodeName === "PipelineSummary");
                if (summaryTrace?.output) {
                    setPipelineSummary(summaryTrace.output as PipelineSummary);
                }

                // 2. Metrics (마지막 verifier 노드 결과)
                const verifierTraces = traces.filter(t => t.nodeName === "verifier" || t.nodeName === "node_verifier");
                if (verifierTraces.length > 0) {
                    const lastVerifier = verifierTraces[verifierTraces.length - 1];
                    setMetrics(extractMetrics(lastVerifier.output));
                }

                // 3. Final Report 탐색
                let reportData = null;
                const endNode = traces.find(t => t.nodeName === "end" || t.nodeName === "__end__" || t.output?.final_report);

                if (endNode) {
                    reportData = endNode.output?.final_report || endNode.output;
                }

                if (summaryTrace?.output?.coscientist) {
                    const cos = summaryTrace.output.coscientist;
                    if (!reportData) {
                        reportData = {
                            success: cos.success,
                            total_attempts: cos.total_attempts,
                            message: cos.message || "N/A",
                            tool_usage: cos.tool_usage || {},
                        };
                    } else {
                        if ((!reportData.tool_usage || Object.keys(reportData.tool_usage).length === 0) && cos.tool_usage) {
                            reportData.tool_usage = cos.tool_usage;
                        }
                        if (!reportData.message && cos.message) {
                            reportData.message = cos.message;
                        }
                    }
                }

                if (reportData) {
                    setFinalReport(reportData);
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

    // 소요시간 포맷팅
    const formatDuration = (sec: number) => {
        if (sec >= 60) return `${Math.floor(sec / 60)}분 ${Math.round(sec % 60)}초`;
        return `${sec.toFixed(1)}초`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#f8f9fa] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                {/* 헤더 */}
                <div className="p-6 bg-white border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Pipeline Conclusion</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">파이프라인 실행 요약 + 모델 품질 지표</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <span className="text-gray-400 text-xl">✕</span>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 font-medium animate-pulse">데이터를 분석하고 있습니다...</div>
                    ) : error ? (
                        <div className="py-20 text-center text-red-500 font-bold">{error}</div>
                    ) : (
                        <>
                            {/* ============ 파이프라인 요약 ============ */}
                            {pipelineSummary && (
                                <>
                                    <PipelineSummaryBanner summary={pipelineSummary} formatDuration={formatDuration} />
                                    <Timeline steps={pipelineSummary.steps} totalTimeSec={pipelineSummary.total_time_sec} formatDuration={formatDuration} />
                                    {pipelineSummary.coscientist && <CoScientistInfo coscientist={pipelineSummary.coscientist} />}
                                </>
                            )}

                            {/* ============ 모델 품질 분석 ============ */}
                            {metrics && (
                                <>
                                    <div className="flex items-center gap-3 pt-1">
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">최종 모델 품질</span>
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                                        <MetricCard
                                            label="안정성 점수"
                                            value={metrics.stability_score}
                                            isScore
                                        />
                                        <MetricCard
                                            label="총 브릭 개수"
                                            value={metrics.total_bricks}
                                        />
                                        <MetricCard
                                            label="공중부양 브릭"
                                            value={metrics.floating_count}
                                        />
                                        <MetricCard
                                            label="고립된 브릭"
                                            value={metrics.isolated_count}
                                        />
                                    </div>

                                    {/* 도구 사용 현황 */}
                                    {finalReport?.tool_usage && Object.keys(finalReport.tool_usage).length > 0 && (
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100">
                                            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
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
                        </>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-6 bg-gray-50 border-t flex items-center justify-between">
                    <div>
                        {finalLdrUrl && (
                            <a href={finalLdrUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg text-sm inline-flex items-center gap-2">
                                ⬇️ 최종 LDR 다운로드
                            </a>
                        )}
                    </div>
                    <button onClick={onClose} className="px-6 py-3 bg-black text-white rounded-xl font-black hover:bg-gray-900 transition-all active:scale-95 shadow-lg">
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
