import React, { useEffect, useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];


interface DailyTrend {
    date: string;
    count: number;
}

interface TopTag {
    tag: string;
    count: number;
}

interface HeavyUser {
    userId: string;
    eventCount: number;
}

interface PerformanceResponse {
    failureStats: { reason: string; count: number }[];
    performance: {
        avgWaitTime: number;
        avgCost: number;
        avgBrickCount: number;
    };
}

export default function DetailedAnalytics() {
    const { authFetch } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dailyUsers, setDailyUsers] = useState<DailyTrend[]>([]);
    const [genTrend, setGenTrend] = useState<DailyTrend[]>([]); // [NEW] Generation Trend
    const [performance, setPerformance] = useState<PerformanceResponse | null>(null); // [NEW] Performance Data
    const [topTags, setTopTags] = useState<TopTag[]>([]);
    const [heavyUsers, setHeavyUsers] = useState<HeavyUser[]>([]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [usersRes, genRes, perfRes, tagsRes, heavyRes] = await Promise.all([
                    authFetch("/api/admin/analytics/daily-users?days=30"),
                    authFetch("/api/admin/analytics/generation-trend?days=7"),
                    authFetch("/api/admin/analytics/performance?days=30"),
                    authFetch("/api/admin/analytics/top-tags?days=30&limit=10"),
                    authFetch("/api/admin/analytics/heavy-users?days=30&limit=10")
                ]);

                if (usersRes.ok) {
                    const data = await usersRes.json();
                    setDailyUsers(Array.isArray(data) ? data : []);
                }
                if (genRes.ok) {
                    const data = await genRes.json();
                    if (Array.isArray(data)) {
                        setGenTrend(data.sort((a: DailyTrend, b: DailyTrend) => a.date.localeCompare(b.date)));
                    } else {
                        setGenTrend([]);
                    }
                }
                if (perfRes.ok) {
                    const data = await perfRes.json();
                    // Validate structure
                    if (data && typeof data === 'object' && Array.isArray(data.failureStats)) {
                        setPerformance(data);
                    } else {
                        console.error("Invalid performance data format:", data);
                        setPerformance(null);
                    }
                }
                if (tagsRes.ok) {
                    const data = await tagsRes.json();
                    setTopTags(Array.isArray(data) ? data : []);
                }
                if (heavyRes.ok) {
                    const data = await heavyRes.json();
                    setHeavyUsers(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Failed to fetch detailed analytics", e);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [authFetch]);

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
    );

    // 날짜 포맷팅 (YYYYMMDD -> MM/DD) 및 정렬 (오름차순) - useMemo 적용
    const formattedDailyUsers = useMemo(() => {
        return [...dailyUsers]
            .sort((a, b) => a.date.localeCompare(b.date)) // 날짜 오름차순
            .map(d => ({
                ...d,
                date: d.date.length === 8 ? `${d.date.substring(4, 6)}/${d.date.substring(6, 8)}` : d.date
            }));
    }, [dailyUsers]);

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
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center">
                                    <p className="text-gray-500 font-bold mb-2">⏳ 평균 생성 시간</p>
                                    <p className="text-3xl font-black text-blue-600">{Math.round(performance.performance.avgWaitTime || 0)}초</p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center">
                                    <p className="text-gray-500 font-bold mb-2">💸 평균 소모 비용</p>
                                    <p className="text-3xl font-black text-green-600">${(performance.performance.avgCost || 0).toFixed(3)}</p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center">
                                    <p className="text-gray-500 font-bold mb-2">🧱 평균 브릭 수</p>
                                    <p className="text-3xl font-black text-purple-600">{Math.round(performance.performance.avgBrickCount || 0)}개</p>
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
                            <LineChart data={genTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fontWeight: 'bold' }}
                                    stroke="#000"
                                    tickFormatter={(str) => str.length === 8 ? `${str.substring(4, 6)}/${str.substring(6, 8)}` : str}
                                />
                                <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} stroke="#000" allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '2px solid black', fontWeight: 'bold', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#ffe135', strokeWidth: 2 }}
                                    labelFormatter={(label) => label.length === 8 ? `${label.substring(0, 4)}년 ${label.substring(4, 6)}월 ${label.substring(6, 8)}일` : label}
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
                            <BarChart data={topTags} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="tag" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} interval={0} />
                                <Tooltip cursor={{ fill: '#f1f2f6' }} contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                                <Bar dataKey="count" name="사용 횟수" fill="#ff9f43" radius={[0, 8, 8, 0]} label={{ position: 'right', fontWeight: 'bold', fontSize: 12 }}>
                                    {topTags.map((entry, index) => (
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
                            {heavyUsers.map((user, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors font-bold text-gray-700">
                                    <td className="py-4 px-4">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                    </td>
                                    <td className="py-4 px-4 font-mono text-sm">{user.userId}</td>
                                    <td className="py-4 px-4 text-right text-lg">{user.eventCount.toLocaleString()}</td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="w-24 h-2 bg-gray-100 rounded-full inline-block overflow-hidden">
                                            <div
                                                className="h-full bg-black"
                                                style={{ width: `${Math.min(100, (user.eventCount / (heavyUsers[0]?.eventCount || 1)) * 100)}%` }}
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
