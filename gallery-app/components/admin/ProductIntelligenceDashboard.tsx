import React, { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ['#ffe135', '#ff9f43', '#ee5253', '#10ac84', '#5f27cd', '#48dbfb'];

interface IntelligenceData {
    funnel: Array<{ stage: string; count: number }>;
    quality: {
        avgStability: number;
        avgBrickCount: number;
        avgLatency: number;
        totalCost: number;
    };
    exits: Array<{ step: string; count: number }>;
}

export default function ProductIntelligenceDashboard() {
    const { authFetch } = useAuth();
    const [data, setData] = useState<IntelligenceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authFetch("/api/admin/analytics/product-intelligence?days=14");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error("Failed to fetch intelligence data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [authFetch]);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-100 rounded-3xl" />
            ))}
        </div>
    );

    if (!data) return null;

    return (
        <div className="space-y-8">
            {/* 1. Key Performance Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Engine Stability" value={`${(data.quality.avgStability * 100).toFixed(1)}%`} desc="Average Physics Score" color="#10ac84" />
                <KPICard title="Avg Complexity" value={`${data.quality.avgBrickCount.toFixed(0)} Bricks`} desc="Model Density" color="#ff9f43" />
                <KPICard title="AI Latency" value={`${(data.quality.avgLatency / 1000).toFixed(1)}s`} desc="Avg Generation Time" color="#5f27cd" />
                <KPICard title="Operational Cost" value={`$${data.quality.totalCost.toFixed(2)}`} desc="Estimated API Usage" color="#ee5253" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. Conversion Funnel */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                    <h3 className="text-xl font-black mb-6">User Conversion Funnel</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.funnel} layout="vertical" margin={{ left: 40 }}>
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

                {/* 3. UX Friction Analysis (Exit Points) */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-black shadow-sm">
                    <h3 className="text-xl font-black mb-6">Friction Points (Dropped Users)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.exits}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="step"
                                >
                                    {data.exits.map((entry, index) => (
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
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, desc, color }: { title: string, value: string, desc: string, color: string }) {
    return (
        <div className="bg-white border-2 border-black p-6 rounded-[32px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
                <h4 className="text-3xl font-black mb-1" style={{ color }}>{value}</h4>
                <p className="text-xs font-bold text-gray-400">{desc}</p>
            </div>
            <div
                className="absolute right-[-10px] bottom-[-10px] w-16 h-16 opacity-10 group-hover:scale-125 transition-transform"
                style={{ backgroundColor: color, borderRadius: '50%' }}
            />
        </div>
    );
}
