import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb', '#2e86de', '#ff6b6b', '#feca57', '#a29bfe'];

interface TopPage {
    pagePath: string;
    screenPageViews: number;
}

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

export default function DetailedAnalytics() {
    const { authFetch } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dailyUsers, setDailyUsers] = useState<DailyTrend[]>([]);
    const [topPages, setTopPages] = useState<TopPage[]>([]);
    const [topTags, setTopTags] = useState<TopTag[]>([]);
    const [heavyUsers, setHeavyUsers] = useState<HeavyUser[]>([]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [usersRes, pagesRes, tagsRes, heavyRes] = await Promise.all([
                    authFetch("/api/admin/analytics/daily-users?days=30"),
                    authFetch("/api/admin/analytics/top-pages?days=30&limit=10"),
                    authFetch("/api/admin/analytics/top-tags?days=30&limit=10"),
                    authFetch("/api/admin/analytics/heavy-users?days=30&limit=10")
                ]);

                if (usersRes.ok) setDailyUsers(await usersRes.json());
                if (pagesRes.ok) setTopPages(await pagesRes.json());
                if (tagsRes.ok) setTopTags(await tagsRes.json());
                if (heavyRes.ok) setHeavyUsers(await heavyRes.json());
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

    // 날짜 포맷팅 (YYYYMMDD -> MM/DD)
    const formattedDailyUsers = dailyUsers.map(d => ({
        ...d,
        date: d.date.length === 8 ? `${d.date.substring(4, 6)}/${d.date.substring(6, 8)}` : d.date
    })).reverse(); // GA4 often returns desc

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. 인기 페이지 */}
                <section className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                    <h3 className="text-xl font-black mb-6">🔥 가장 많이 방문한 페이지 (Top 10)</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPages} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="pagePath" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} />
                                <Tooltip cursor={{ fill: '#f1f2f6' }} contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }} />
                                <Bar dataKey="screenPageViews" name="조회수" fill="#ffe135" radius={[0, 8, 8, 0]} label={{ position: 'right', fontWeight: 'bold', fontSize: 12 }}>
                                    {topPages.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
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
        </div>
    );
}
