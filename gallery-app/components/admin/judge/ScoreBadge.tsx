import React from "react";

interface ScoreBadgeProps {
    score: number;
    stable: boolean;
}

export const ScoreBadge = ({ score, stable }: ScoreBadgeProps) => {
    const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
    const bg = score >= 80 ? "bg-green-50" : score >= 50 ? "bg-yellow-50" : "bg-red-50";
    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}>
            <span className={`text-2xl font-bold ${color}`}>{score}</span>
            <span className="text-xs text-gray-500">/ 100</span>
        </div>
    );
};
