import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

export default function DeepInsights() {
    const { deepInsight, loading } = useAdminDetailData();

    // ⚠️ 모든 useMemo는 early return 위에 배치 — 훅 호출 순서 보장 (React #310 방지)
    const categoryData = useMemo(() => {
        if (!deepInsight?.categoryStats) return [];
        return deepInsight.categoryStats.map(c => ({
            ...c,
            total: c.successCount + c.failCount,
            successRate: (c.successCount + c.failCount) > 0
                ? Math.round((c.successCount / (c.successCount + c.failCount)) * 100)
                : 0
        })).sort((a, b) => b.total - a.total);
    }, [deepInsight]);

    const keywordData = useMemo(() => {
        if (!deepInsight?.keywordStats) return [];
        return deepInsight.keywordStats.map((k, i) => ({
            x: (i % 5) * 100 + Math.random() * 50,
            y: Math.floor(i / 5) * 100 + Math.random() * 50,
            z: k.count * 100,
            keyword: k.keyword,
            count: k.count,
            fill: COLORS[i % COLORS.length]
        }));
    }, [deepInsight]);

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Category Success Rate */}
                <section className="bg-white p-8 rounded-[24px] border-2 border-black shadow-none">
                    <h3 className="text-xl font-black mb-2">🏆 카테고리별 성공률</h3>
                    <p className="text-sm text-gray-500 mb-6 font-bold">어떤 주제가 가장 잘 만들어지나요?</p>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f2f6' }}
                                    contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="successCount" name="성공" stackId="a" fill="#10ac84" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="failCount" name="실패" stackId="a" fill="#ee5253" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* 2. User Search Keywords */}
                <section className="bg-white p-8 rounded-[24px] border-2 border-black shadow-none">
                    <h3 className="text-xl font-black mb-2">🔍 유저 관심 키워드 (Top 20)</h3>
                    <p className="text-sm text-gray-500 mb-6 font-bold">사용자들이 무엇을 검색하고 있나요?</p>
                    <div className="h-[350px] w-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        {keywordData.length === 0 ? (
                            <div className="text-center text-gray-400 font-bold">
                                데이터가 부족합니다 😅<br />(검색 이벤트가 아직 없습니다)
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <ZAxis type="number" dataKey="z" range={[400, 4000]} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-black text-white p-3 rounded-lg text-sm font-bold shadow-xl">
                                                        <p className="text-yellow-400 text-lg">"{String(data.keyword)}"</p>
                                                        <p>검색 횟수: {Number(data.count)}회</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter data={keywordData} fill="#8884d8">
                                        {keywordData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
