import React from "react";
import { useAdminDashboard } from "@/hooks/admin/useAdminDashboard";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminAIReport from "./AdminAIReport";

interface DashboardTabProps {
    aiState: {
        [key: string]: any;
    };
    activeTab: string;
}

export default function DashboardTab({ aiState, activeTab }: DashboardTabProps) {
    const { t } = useLanguage();
    const { stats } = useAdminDashboard();

    return (
        <div className="flex flex-col gap-6">
            <AdminAIReport aiState={aiState} activeTab={activeTab} />
            <p className="text-gray-600 font-medium">{t.admin.welcome}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.users}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalUsers ?? "--"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.jobs}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalJobs ?? "--"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.stats.gallery}</h3>
                    <p className="text-4xl font-black text-gray-900">{stats?.totalGalleryPosts ?? "--"}</p>
                </div>
            </div>
        </div>
    );
}
