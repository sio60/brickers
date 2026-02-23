import React from 'react';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';
import DauTrendChart from './analytics/DauTrendChart';
import PerformanceMetrics from './analytics/PerformanceMetrics';
import GenerationTrendChart from './analytics/GenerationTrendChart';
import TopTagsChart from './analytics/TopTagsChart';
import HeavyUsersTable from './analytics/HeavyUsersTable';

export default function DetailedAnalytics() {
    const { dailyUsers, genTrend, performance, topTags, heavyUsers, loading } = useAdminDetailData();

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* 1. 일별 활성 유저 트렌드 */}
            <DauTrendChart dailyUsers={dailyUsers || []} />

            {/* 2. 시스템 성능 및 실패 분석 */}
            {performance && <PerformanceMetrics performance={performance} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 3. 일별 브릭 생성 활성화 (Trend) */}
                <GenerationTrendChart genTrend={genTrend || []} />

                {/* 4. 인기 태그 */}
                <TopTagsChart topTags={topTags || []} />
            </div>

            {/* 5. 헤비 유저 */}
            <HeavyUsersTable heavyUsers={heavyUsers || []} />
        </div >
    );
}
