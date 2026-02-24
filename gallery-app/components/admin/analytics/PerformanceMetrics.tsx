import React from 'react';
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

interface PerformanceMetricsProps {
    performance: {
        failureStats: { reason: string; count: number; }[];
        performance: {
            avgWaitTime: number;
            avgCostToday?: number;
            avgBrickCount: number;
            avgTokenToday?: number;
        };
    };
}

export default function PerformanceMetrics({ performance }: PerformanceMetricsProps) {
    if (!performance) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Failure Reason */}
            <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm lg:col-span-1">
                <h3 className="text-xl font-black mb-4">⚠️ 실패 원인 분석</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={performance.failureStats}
                                dataKey="count"
                                nameKey="reason"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={(props: any) => String(props.name || '')}
                            >
                                {performance.failureStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Performance Stats */}
            <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm lg:col-span-2 flex flex-col justify-center">
                <h3 className="text-xl font-black mb-8">⚡ 시스템 성능 지표 (평균)</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                        <p className="text-gray-500 font-bold mb-2 text-sm">⏳ 생성 시간</p>
                        <p className="text-2xl lg:text-3xl font-black text-blue-600 truncate">{Math.round(Number(performance.performance.avgWaitTime) || 0)}s</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                        <p className="text-gray-500 font-bold mb-2 text-sm">💸 소모 비용 (Avg)</p>
                        <p className="text-2xl lg:text-3xl font-black text-green-600 truncate">
                            ${(Number(performance.performance.avgCostToday) || 0).toFixed(4)}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                        <p className="text-gray-500 font-bold mb-2 text-sm">🧱 사용 브릭</p>
                        <p className="text-2xl lg:text-3xl font-black text-purple-600 truncate">{Math.round(Number(performance.performance.avgBrickCount) || 0)}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                        <p className="text-gray-500 font-bold mb-2 text-sm">🤖 토큰 소모 (Avg)</p>
                        <p className="text-2xl lg:text-3xl font-black text-red-500 truncate">
                            {Math.round(Number(performance.performance.avgTokenToday) || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
