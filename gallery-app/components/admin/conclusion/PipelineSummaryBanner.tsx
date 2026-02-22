import React from "react";

interface PipelineSummaryBannerProps {
    summary: {
        subject: string;
        engine: string;
        total_time_sec: number;
        budget: number;
        result: {
            parts: number;
            bom_unique_parts: number;
            ldr_size_kb: number;
            est_cost?: number;
            token_count?: number;
        };
    };
    formatDuration: (sec: number) => string;
}

export const PipelineSummaryBanner = ({ summary, formatDuration }: PipelineSummaryBannerProps) => {
    return (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="text-xs font-bold opacity-70 uppercase tracking-wider">Pipeline Complete</div>
                    <div className="text-lg font-black mt-0.5">
                        {summary.subject || "Unknown"}
                        <span className="text-sm font-medium opacity-80 ml-2">({summary.engine})</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black">{formatDuration(summary.total_time_sec)}</div>
                    <div className="text-xs opacity-70">총 소요시간</div>
                </div>
            </div>
            {/* 결과 요약 칩 */}
            <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                    🧱 {summary.result.parts}개 브릭
                </span>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                    📦 {summary.result.bom_unique_parts}종 부품
                </span>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                    📄 {summary.result.ldr_size_kb}KB
                </span>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">
                    💰 Budget {summary.budget}
                </span>
                {summary.result.est_cost !== undefined && (
                    <span className="px-2.5 py-1 bg-green-500/30 rounded-lg text-xs font-bold backdrop-blur-sm border border-green-400/30">
                        💸 ${summary.result.est_cost.toFixed(4)}
                    </span>
                )}
                {summary.result.token_count !== undefined && (
                    <span className="px-2.5 py-1 bg-blue-500/30 rounded-lg text-xs font-bold backdrop-blur-sm border border-blue-400/30">
                        🪙 {summary.result.token_count.toLocaleString()} T
                    </span>
                )}
            </div>
        </div>
    );
};
