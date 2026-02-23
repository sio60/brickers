import React from "react";

interface MetricCardProps {
    label: string;
    value: number;
    isScore?: boolean;
}

export const MetricCard = ({ label, value, isScore = false }: MetricCardProps) => {
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
            <div className="flex items-center justify-between">
                <div className="text-2xl font-black text-gray-900">
                    {value}{isScore ? '점' : ''}
                </div>
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <span className="text-xl">
                        {label.includes('안정성') ? '🏗️' : label.includes('브릭') ? '🧱' : '🧩'}
                    </span>
                </div>
            </div>
        </div>
    );
};
