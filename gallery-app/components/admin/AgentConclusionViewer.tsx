// 에이전트 작업 전/후 성능 비교 + 파이프라인 요약 뷰어
"use client";

import React, { useEffect, useState } from "react";

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
}

export default function AgentConclusionViewer({ jobId, onClose }: AgentConclusionViewerProps) {
    const [loading, setLoading] = useState(true);
    const [beforeMetrics, setBeforeMetrics] = useState<Metrics | null>(null);
    const [afterMetrics, setAfterMetrics] = useState<Metrics | null>(null);
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

                // 2. Before Metrics (첫 번째 verifier 노드 결과)
                const verifierTraces = traces.filter(t => t.nodeName === "verifier" || t.nodeName === "node_verifier");

                if (verifierTraces.length > 0) {
                    const firstVerifier = verifierTraces[0];
                    setBeforeMetrics(extractMetrics(firstVerifier.output));

                    // 3. After Metrics (마지막 verifier 노드 결과)
                    const lastVerifier = verifierTraces[verifierTraces.length - 1];
                    setAfterMetrics(extractMetrics(lastVerifier.output));
                }

                // 4. Final Report 탐색 (end 노드 → PipelineSummary fallback)
                const endNode = traces.find(t => t.nodeName === "end" || t.nodeName === "__end__" || t.output?.final_report);
                if (endNode) {
                    setFinalReport(endNode.output?.final_report || endNode.output);
                } else if (summaryTrace?.output?.coscientist) {
                    // PipelineSummary의 coscientist 데이터를 fallback으로 사용
                    const cos = summaryTrace.output.coscientist;
                    setFinalReport({
                        success: cos.success,
                        total_attempts: cos.total_attempts,
                        message: cos.message || "N/A",
                        tool_usage: cos.tool_usage || {},
                    });
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

    // 단계별 상태 아이콘
    const stepIcon = (status: string) => {
        switch (status) {
            case "SUCCESS": return "✅";
            case "FALLBACK": return "⚠️";
            case "FAILURE": return "❌";
            default: return "⏳";
        }
    };

    // 타임라인 바 너비 계산 (비율)
    const getBarWidth = (stepSec: number, totalSec: number) => {
        if (totalSec <= 0) return 0;
        return Math.max(8, Math.min(100, (stepSec / totalSec) * 100));
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
                {/* 헤더 */}
                <div className="p-6 bg-white border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Pipeline Conclusion</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">파이프라인 실행 요약 + 에이전트 성능 비교</p>
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
                                    {/* 요약 배너 */}
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-2xl text-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="text-xs font-bold opacity-70 uppercase tracking-wider">Pipeline Complete</div>
                                                <div className="text-lg font-black mt-0.5">
                                                    {pipelineSummary.subject || "Unknown"}
                                                    <span className="text-sm font-medium opacity-80 ml-2">({pipelineSummary.engine})</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black">{formatDuration(pipelineSummary.total_time_sec)}</div>
                                                <div className="text-xs opacity-70">총 소요시간</div>
                                            </div>
                                        </div>
                                        {/* 결과 요약 칩 */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                                                🧱 {pipelineSummary.result.parts}개 브릭
                                            </span>
                                            <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                                                📦 {pipelineSummary.result.bom_unique_parts}종 부품
                                            </span>
                                            <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                                                📄 {pipelineSummary.result.ldr_size_kb}KB
                                            </span>
                                            <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                                                💰 Budget {pipelineSummary.budget}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 단계별 타임라인 */}
                                    <div className="bg-white p-5 rounded-2xl border border-gray-100">
                                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                            단계별 실행 내역
                                        </h3>
                                        <div className="space-y-3">
                                            {pipelineSummary.steps.map((step, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="text-base w-6 text-center">{stepIcon(step.status)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold text-gray-700 truncate">{step.name}</span>
                                                            <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">
                                                                {formatDuration(step.duration_sec)}
                                                            </span>
                                                        </div>
                                                        {/* 타임라인 바 */}
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${step.status === "SUCCESS" ? "bg-indigo-400" :
                                                                    step.status === "FALLBACK" ? "bg-amber-400" : "bg-red-400"
                                                                    }`}
                                                                style={{ width: `${getBarWidth(step.duration_sec, pipelineSummary.total_time_sec)}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5 truncate">{step.detail}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CoScientist 정보 */}
                                    {pipelineSummary.coscientist && (
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100">
                                            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                                CoScientist 에이전트
                                            </h3>
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${pipelineSummary.coscientist.success
                                                    ? "bg-green-50 text-green-700 border-green-100"
                                                    : "bg-red-50 text-red-700 border-red-100"
                                                    }`}>
                                                    {pipelineSummary.coscientist.success ? "SUCCESS" : "FAILED"}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    시도: <span className="font-bold text-gray-900">{pipelineSummary.coscientist.total_attempts}회</span>
                                                </span>
                                            </div>
                                            {pipelineSummary.coscientist.message && (
                                                <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg mb-3">{pipelineSummary.coscientist.message}</p>
                                            )}
                                            {/* 도구 사용 현황 */}
                                            {Object.keys(pipelineSummary.coscientist.tool_usage).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.entries(pipelineSummary.coscientist.tool_usage).map(([tool, count]) => (
                                                        <span key={tool} className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold border border-purple-100">
                                                            {tool}: {count}회
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* 파이프라인 요약 없는 경우 안내 */}
                            {!pipelineSummary && !beforeMetrics && (
                                <div className="py-16 text-center text-gray-400 font-medium">
                                    <div className="text-4xl mb-3">📊</div>
                                    파이프라인 요약 데이터가 없습니다.
                                    <div className="text-xs mt-1">(이 Job은 업데이트 이전에 실행되었을 수 있습니다)</div>
                                </div>
                            )}

                            {/* ============ 기존 메트릭 비교 (Before/After) ============ */}
                            {beforeMetrics && (
                                <>
                                    {/* 구분선 */}
                                    {pipelineSummary && (
                                        <div className="flex items-center gap-3 pt-1">
                                            <div className="flex-1 h-px bg-gray-200"></div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Agent Metrics</span>
                                            <div className="flex-1 h-px bg-gray-200"></div>
                                        </div>
                                    )}

                                    {/* 결과 배너 */}
                                    <div className={`p-4 rounded-2xl flex items-center justify-between border-2 ${finalReport?.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
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

                                    {/* 메트릭 그리드 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                                    {/* 도구 사용 현황 (기존) */}
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
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-black text-white rounded-xl font-black hover:bg-gray-900 transition-all active:scale-95 shadow-lg">
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
