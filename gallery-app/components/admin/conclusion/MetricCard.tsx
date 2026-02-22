import React from "react";

interface MetricCardProps {
    label: string;
    before: number;
    after: number;
    isScore?: boolean;
}

export const MetricCard = ({ label, before, after, isScore = false }: MetricCardProps) => {
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
