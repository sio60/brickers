import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { useAdminDetailData } from '@/contexts/AdminDetailDataContext';

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

export default function DetailedAnalytics() {
    const { dailyUsers, genTrend, performance, topTags, heavyUsers, loading } = useAdminDetailData();

    // ⚠️ 모든 useMemo는 early return 위에 배치 — 훅 호출 순서 보장 (React #310 방지)
    const formattedDailyUsers = useMemo(() => {
        if (!Array.isArray(dailyUsers) || dailyUsers.length === 0) return [];
        return [...dailyUsers]
            .filter(d => d && typeof d.date === 'string')
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                ...d,
                date: d.date.length === 8 ? `${d.date.substring(4, 6)}/${d.date.substring(6, 8)}` : d.date,
                count: typeof d.count === 'number' ? d.count : Number(d.count) || 0
            }));
    }, [dailyUsers]);

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* 1. 일별 활성 유저 트렌드 */}
            <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                <h3 className="text-xl font-black mb-6">📅 일별 활성 사용자 (DAU) 추이 (최근 30일)</h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedDailyUsers} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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

            {/* [NEW] Detailed Performance Metrics */}
            {
                performance && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Failure Reason */}
                        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm lg:col-span-1">
                            <h3 className="text-xl font-black mb-4">⚠️ 실패 원인 분석</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={performance.failureStats}
                                            dataKey="count"
                                            nameKey="reason"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(props: any) => String(props.name || '')}
                                        >
                                            {performance.failureStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* Performance Stats */}
                        <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm lg:col-span-2 flex flex-col justify-center">
                            <h3 className="text-xl font-black mb-8">⚡ 시스템 성능 지표 (평균)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 font-bold mb-2 text-sm">⏳ 생성 시간</p>
                                    <p className="text-2xl lg:text-3xl font-black text-blue-600 truncate">{Math.round(Number(performance?.performance?.avgWaitTime) || 0)}s</p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 font-bold mb-2 text-sm">💸 소모 비용 (Total / Avg)</p>
                                    <div className="flex flex-col items-center">
                                        <p className="text-2xl lg:text-3xl font-black text-green-600 truncate">
                                            ${(Number(performance?.performance?.totalCost) || 0).toFixed(4)}
                                        </p>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <p className="text-[10px] text-gray-400 font-bold">
                                                All-time Avg: ${(Number(performance?.performance?.avgCost) || 0).toFixed(5)}
                                            </p>
                                            <p className="text-[10px] text-blue-500 font-black bg-blue-50 px-2 py-0.5 rounded-full">
                                                Today Avg: ${(Number(performance?.performance?.avgCostToday) || 0).toFixed(4)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 font-bold mb-2 text-sm">🧱 사용 브릭</p>
                                    <p className="text-2xl lg:text-3xl font-black text-purple-600 truncate">{Math.round(Number(performance?.performance?.avgBrickCount) || 0)}</p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 font-bold mb-2 text-sm">🤖 토큰 소모</p>
                                    <div className="flex flex-col items-center">
                                        <p className="text-2xl lg:text-3xl font-black text-red-500 truncate">
                                            {Math.round(Number(performance?.performance?.tokenCount) || 0).toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-orange-500 font-black bg-orange-50 px-2 py-0.5 rounded-full mt-1">
                                            Today Avg: {Math.round(Number(performance?.performance?.avgTokenToday) || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. 일별 브릭 생성 활성화 (Trend) */}
                <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                    <h3 className="text-xl font-black mb-6">🚀 일별 브릭 생성 활성화 (최근 7일)</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={genTrend || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fontWeight: 'bold' }}
                                    stroke="#000"
                                    tickFormatter={(str) => typeof str === 'string' && str.length === 8 ? `${str.substring(4, 6)}/${str.substring(6, 8)}` : String(str)}
                                />
                                <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} stroke="#000" allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#ffe135', strokeWidth: 2 }}
                                    labelFormatter={(label) => typeof label === 'string' && label.length === 8 ? `${label.substring(0, 4)}년 ${label.substring(4, 6)}월 ${label.substring(6, 8)}일` : String(label)}
                                />
                                <Legend />
                                <Line
                                    type="step"
                                    dataKey="count"
                                    name="생성 성공"
                                    stroke="#5f27cd"
                                    strokeWidth={4}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                    dot={{ r: 4, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* 3. 인기 태그 */}
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
            </div>

            {/* 4. 헤비 유저 */}
            <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                <h3 className="text-xl font-black mb-6">👑 활동량 상위 유저 (Heavy Users)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-3 px-4 font-black text-gray-400 uppercase text-xs">순위</th>
                                <th className="py-3 px-4 font-black text-gray-400 uppercase text-xs">사용자 (ID/Nickname)</th>
                                <th className="py-3 px-4 font-black text-gray-400 uppercase text-xs text-right">이벤트 발생량</th>
                                <th className="py-3 px-4 font-black text-gray-400 uppercase text-xs text-right">기여도</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {Array.isArray(heavyUsers) && heavyUsers.map((user, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors font-bold text-gray-700">
                                    <td className="py-4 px-4">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                    </td>
                                    <td className="py-4 px-4 font-mono text-sm">{String(user.userId ?? '')}</td>
                                    <td className="py-4 px-4 text-right text-lg">{(typeof user.generationCount === 'number' ? user.generationCount : Number(user.generationCount) || 0).toLocaleString()}</td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="w-24 h-2 bg-gray-100 rounded-full inline-block overflow-hidden">
                                            <div
                                                className="h-full bg-black"
                                                style={{ width: `${Math.min(100, (Number(user.generationCount) || 0) / (Number(heavyUsers[0]?.generationCount) || 1) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div >
    );
}
