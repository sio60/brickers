import React from "react";

interface PipelineStep {
    name: string;
    duration_sec: number;
    status: string;
    detail: string;
}

interface TimelineProps {
    steps: PipelineStep[];
    totalTimeSec: number;
    formatDuration: (sec: number) => string;
}

export const Timeline = ({ steps, totalTimeSec, formatDuration }: TimelineProps) => {
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

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                단계별 실행 내역
            </h3>
            <div className="space-y-3">
                {steps.map((step, i) => (
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
                                    style={{ width: `${getBarWidth(step.duration_sec, totalTimeSec)}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate">{step.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
