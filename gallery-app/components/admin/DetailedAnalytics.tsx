import React from 'react';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';
import DauTrendChart from './analytics/DauTrendChart';
import PerformanceMetrics from './analytics/PerformanceMetrics';
import GenerationTrendChart from './analytics/GenerationTrendChart';
import TopTagsChart from './analytics/TopTagsChart';
import HeavyUsersTable from './analytics/HeavyUsersTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb'];

export default function DetailedAnalytics() {
    const { dailyUsers, genTrend, performance, topTags, heavyUsers, productIntelligence, loading } = useAdminDetailData();

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* 1. 일별 활성 유저 트렌드 */}
            <DauTrendChart dailyUsers={dailyUsers || []} />

            {/* 2. 전 서비스 전환 퍼널 (Funnel) */}
            <div className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                <h3 className="text-xl font-black mb-6">사용자 전환 퍼널 (Funnel)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productIntelligence?.funnel || []} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="stage" type="category" width={80} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold' }}
                                cursor={{ fill: '#ffe135', opacity: 0.2 }}
                            />
                            <Bar dataKey="count" fill="#ffe135" radius={[0, 10, 10, 0]} label={{ position: 'right', fontWeight: 'bold' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. 시스템 성능 및 실패 분석 */}
            <PerformanceMetrics performance={performance as any} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 4. 일별 브릭 생성 활성화 (Trend) */}
                <GenerationTrendChart genTrend={genTrend || []} />

                {/* 5. 인기 태그 */}
                <TopTagsChart topTags={topTags || []} />
            </div>

            {/* 6. 헤비 유저 */}
            <HeavyUsersTable heavyUsers={heavyUsers || []} />
        </div >
    );
}
