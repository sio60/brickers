import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DauTrendChartProps {
    dailyUsers: Array<{ date: string; count: number }>;
}

export default function DauTrendChart({ dailyUsers }: DauTrendChartProps) {
    const formattedData = useMemo(() => {
        if (!Array.isArray(dailyUsers)) return [];
        return [...dailyUsers]
            .filter(d => d && typeof d.date === 'string')
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                ...d,
                date: d.date.length === 8 ? `${d.date.substring(4, 6)}/${d.date.substring(6, 8)}` : d.date,
                count: Number(d.count) || 0
            }));
    }, [dailyUsers]);

    return (
        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
            <h3 className="text-xl font-black mb-6">📅 일별 활성 사용자 (DAU) 추이 (최근 30일)</h3>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                        <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                            cursor={{ stroke: '#ffe135', strokeWidth: 2 }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" name="방문자 수" stroke="#10ac84" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
