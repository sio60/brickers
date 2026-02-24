import React from 'react';

interface HeavyUser {
    userId: string;
    generationCount: number;
}

interface HeavyUsersTableProps {
    heavyUsers: HeavyUser[];
}

export default function HeavyUsersTable({ heavyUsers }: HeavyUsersTableProps) {
    if (!Array.isArray(heavyUsers)) return null;

    return (
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
                                <td className="py-4 px-4 font-mono text-sm">{String(user.userId ?? '')}</td>
                                <td className="py-4 px-4 text-right text-lg">{Number(user.generationCount || 0).toLocaleString()}</td>
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
    );
}
