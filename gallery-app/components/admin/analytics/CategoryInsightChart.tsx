import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryInsightChartProps {
    categoryStats: Array<{ category: string; successCount: number; failCount: number; }>;
}

export default function CategoryInsightChart({ categoryStats }: CategoryInsightChartProps) {
    if (!Array.isArray(categoryStats)) return null;

    return (
        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
            <h3 className="text-xl font-black mb-6">📂 이미지 카테고리별 생성 결과</h3>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontWeight: 'bold' }} stroke="#000" />
                        <YAxis tick={{ fontWeight: 'bold' }} stroke="#000" />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold' }} />
                        <Legend />
                        <Bar dataKey="successCount" name="성공" fill="#10ac84" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="failCount" name="실패" fill="#ee5253" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
