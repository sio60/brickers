import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

interface TopTagsChartProps {
    topTags: Array<{ tag: string; count: number }>;
}

export default function TopTagsChart({ topTags }: TopTagsChartProps) {
    return (
        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
            <h3 className="text-xl font-black mb-6">🏷️ 인기 생성 태그 (Top 10)</h3>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTags || []} layout="vertical" margin={{ left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="tag" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} interval={0} />
                        <Tooltip cursor={{ fill: '#f1f2f6' }} contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                        <Bar dataKey="count" name="사용 횟수" fill="#ff9f43" radius={[0, 8, 8, 0]} label={{ position: 'right', fontWeight: 'bold', fontSize: 12, formatter: (v: any) => String(v ?? '') }}>
                            {(topTags || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
