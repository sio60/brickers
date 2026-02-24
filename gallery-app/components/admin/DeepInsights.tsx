import React from 'react';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';
import CategoryInsightChart from './analytics/CategoryInsightChart';
import AgeDistributionChart from './analytics/AgeDistributionChart';

export default function DeepInsights() {
    const { deepInsight, loading } = useAdminDetailData();

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    if (!deepInsight) return (
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

                {/* 3. 기타 분석 메시지 (Place holder) */}
                <section className="bg-yellow-50 p-8 rounded-[32px] border-2 border-black border-dashed flex flex-col justify-center items-center text-center">
                    <p className="text-4xl mb-4">💡</p>
                    <h4 className="text-xl font-black mb-2">데이터 통찰</h4>
                    <p className="font-bold text-gray-600">
                        현재 {deepInsight?.categoryStats?.length || 0}개의 카테고리에서<br />
                        활발한 생성이 이루어지고 있습니다.
                    </p>
                </section>
            </div>
        </div>
    );
}
