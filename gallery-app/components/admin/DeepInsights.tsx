import React from 'react';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';
import CategoryInsightChart from './analytics/CategoryInsightChart';
import AgeDistributionChart from './analytics/AgeDistributionChart';
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb'];

export default function DeepInsights() {
    const { deepInsight, productIntelligence, loading } = useAdminDetailData();

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    if (!deepInsight && !productIntelligence) return (
        <div className="text-center text-gray-400 font-bold p-12">
            유저 성향 데이터를 불러올 수 없습니다.
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn mt-12 bg-gray-50 p-8 rounded-[32px] border-4 border-black border-dashed">
            <div className="flex items-center gap-4 mb-4">
                <div className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transform -rotate-1">
                    NEW 🚀
                </div>
                <h2 className="text-2xl font-black text-gray-800">유저 성향 분석 (User Propensity)</h2>
            </div>

            {/* 1. 카테고리별 성과 분석 */}
            <CategoryInsightChart categoryStats={deepInsight?.categoryStats || []} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. 연령대 분포 */}
                <AgeDistributionChart ageStats={deepInsight?.ageStats || []} />

                {/* 3. 주요 이탈 지점 분석 (Friction Points) */}
                <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm flex flex-col">
                    <h3 className="text-xl font-black mb-6 text-center">📉 주요 이탈 지점 (Friction Points)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={productIntelligence?.exits || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="step"
                                >
                                    {productIntelligence?.exits?.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>
        </div>
    );
}
