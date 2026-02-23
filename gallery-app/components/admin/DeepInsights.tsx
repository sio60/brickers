import React, { useMemo } from 'react';
import {
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    BarChart,
    Bar,
    LabelList,
    Legend,
    CartesianGrid,
    PieChart,
    Pie
} from 'recharts';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

export default function DeepInsights() {
    const { deepInsight, productIntelligence, loading } = useAdminDetailData();

    // 1. 카테고리별 성공률 가공
    const categoryData = useMemo(() => {
        if (!deepInsight?.categoryStats) return [];
        return deepInsight.categoryStats.map(stat => ({
            name: stat.category,
            success: stat.successCount,
            fail: stat.failCount,
            total: stat.successCount + stat.failCount,
            rate: stat.successCount + stat.failCount > 0
                ? (stat.successCount / (stat.successCount + stat.failCount) * 100).toFixed(1)
                : 0
        })).sort((a, b) => b.total - a.total);
    }, [deepInsight?.categoryStats]);

    // 2. 컨버전 퍼널 데이터 가공
    const funnelData = useMemo(() => {
        if (!productIntelligence?.funnel) return [];
        return productIntelligence.funnel.map(item => ({
            name: item.stage,
            count: item.count
        }));
    }, [productIntelligence?.funnel]);

    // 3. 이탈 지점 데이터 가공
    const exitData = useMemo(() => {
        if (!productIntelligence?.exits) return [];
        return productIntelligence.exits.map(item => ({
            name: item.step,
            count: item.count
        }));
    }, [productIntelligence?.exits]);

    // 4. 연령별 분포 가공
    const ageData = useMemo(() => {
        if (!deepInsight?.ageStats) return [];
        return deepInsight.ageStats.map(item => ({
            name: item.ageGroup,
            value: item.count
        })).sort((a, b) => b.value - a.value);
    }, [deepInsight?.ageStats]);

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
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f2f6' }}
                                    contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }}
                                    formatter={(value, name) => {
                                        if (name === 'success') return [`${value}회`, '성공'];
                                        if (name === 'fail') return [`${value}회`, '실패'];
                                        return value;
                                    }}
                                />
                                <Legend formatter={(value) => <span className="font-bold">{value}</span>} />
                                <Bar dataKey="success" name="성공" stackId="a" fill="#10ac84" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="fail" name="실패" stackId="a" fill="#ee5253" radius={[0, 10, 10, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* 2. Conversion Funnel (NEW) */}
                <section className="bg-white p-8 rounded-[24px] border-2 border-black shadow-none">
                    <h3 className="text-xl font-black mb-2">🚀 컨버전 퍼널 (Conversion Funnel)</h3>
                    <p className="text-sm text-gray-500 mb-6 font-bold">유저가 각 단계에서 얼마나 전환되고 있나요?</p>
                    <div className="h-[350px] w-full">
                        {funnelData.length === 0 ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-center text-gray-400 font-bold">데이터가 부족합니다</div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        tick={{ fill: '#000', fontWeight: 'bold', fontSize: 13 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={40}>
                                        <LabelList dataKey="count" position="right" style={{ fontWeight: 'black', fill: '#000' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* 3. Churn/Exit Analysis (NEW) */}
                <section className="bg-white p-8 rounded-[24px] border-2 border-black shadow-none">
                    <h3 className="text-xl font-black mb-2">⚠️ Churn/이탈 지점 분석</h3>
                    <p className="text-sm text-gray-500 mb-6 font-bold">유저들이 주로 어디에서 서비스를 이탈하나요?</p>
                    <div className="h-[350px] w-full">
                        {exitData.length === 0 ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-center text-gray-400 font-bold">이탈 데이터가 없습니다</div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={exitData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#000', fontWeight: 'bold' }}
                                    />
                                    <YAxis tick={{ fill: '#000', fontWeight: 'bold' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="count" fill="#EF4444" radius={[10, 10, 0, 0]}>
                                        <Cell fill="#EF4444" />
                                        <LabelList dataKey="count" position="top" style={{ fontWeight: 'black', fill: '#000' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* 4. Age Distribution (NEW) */}
                <section className="bg-white p-8 rounded-[24px] border-2 border-black shadow-none">
                    <h3 className="text-xl font-black mb-2">👶 연령대별 생성 비중</h3>
                    <p className="text-sm text-gray-500 mb-6 font-bold">어떤 나이대의 아이들이 많이 사용하나요?</p>
                    <div className="h-[350px] w-full">
                        {ageData.length === 0 ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-center text-gray-400 font-bold">연령 데이터가 없습니다</div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={ageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    >
                                        {ageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
