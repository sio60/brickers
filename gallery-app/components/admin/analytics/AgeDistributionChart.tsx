import React from 'react';
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

interface AgeDistributionChartProps {
    ageStats: Array<{ ageGroup: string; count: number; }>;
}

export default function AgeDistributionChart({ ageStats }: AgeDistributionChartProps) {
    if (!Array.isArray(ageStats)) return null;

    return (
        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
            <h3 className="text-xl font-black mb-6">🎂 주요 사용자 연령대 분포</h3>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={ageStats}
                            dataKey="count"
                            nameKey="ageGroup"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(props: any) => `${props.name}: ${props.value}`}
                        >
                            {ageStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
