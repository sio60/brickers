import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface GenerationTrendChartProps {
    genTrend: Array<{ date: string; count: number }>;
}

export default function GenerationTrendChart({ genTrend }: GenerationTrendChartProps) {
    return (
        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
            <h3 className="text-xl font-black mb-6">🚀 일별 브릭 생성 활성화 (최근 7일)</h3>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={genTrend || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fontWeight: 'bold' }}
                            stroke="#000"
                            tickFormatter={(str) => typeof str === 'string' && str.length === 8 ? `${str.substring(4, 6)}/${str.substring(6, 8)}` : String(str)}
                        />
                        <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} stroke="#000" allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                            cursor={{ stroke: '#ffe135', strokeWidth: 2 }}
                            labelFormatter={(label) => typeof label === 'string' && label.length === 8 ? `${label.substring(0, 4)}년 ${label.substring(4, 6)}월 ${label.substring(6, 8)}일` : String(label)}
                        />
                        <Legend />
                        <Line
                            type="step"
                            dataKey="count"
                            name="생성 성공"
                            stroke="#5f27cd"
                            strokeWidth={4}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            dot={{ r: 4, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
