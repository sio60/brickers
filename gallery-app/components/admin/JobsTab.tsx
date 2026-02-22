import React from "react";
import styles from "../../app/admin/AdminPage.module.css";

export interface AdminJob {
    id: string;
    userId: string;
    userInfo?: {
        id: string;
        email: string;
        nickname: string;
    };
    title: string;
    status: string;
    stage: string;
    sourceImageUrl?: string;
    previewImageUrl?: string;
    initialLdrUrl?: string;
    ldrUrl?: string;
    createdAt: string;
    updatedAt: string;
    errorMessage?: string;
    estCost?: number;
    tokenCount?: number;
}

interface JobsTabProps {
    t: any;
    jobs: AdminJob[];
    userSearch: string;
    setUserSearch: (search: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    reportedOnly: boolean;
    setReportedOnly: (only: boolean) => void;
    fetchJobs: () => void;
    setTraceJobId: (id: string | null) => void;
    setConclusionJobId: (id: string | null) => void;
    setTargetVerifyJobId: (id: string | null) => void;
    setActiveTab: (tab: "dashboard" | "users" | "jobs" | "gallery" | "inquiries" | "reports" | "refunds" | "comments" | "brick-judge") => void;
    handleJobAction: (jobId: string, action: 'retry' | 'cancel') => void;
    jobPage: number;
    setJobPage: React.Dispatch<React.SetStateAction<number>>;
    jobTotalPages: number;
}

export default function JobsTab({
    t,
    jobs,
    userSearch,
    setUserSearch,
    filterStatus,
    setFilterStatus,
    reportedOnly,
    setReportedOnly,
    fetchJobs,
    setTraceJobId,
    setConclusionJobId,
    setTargetVerifyJobId,
    setActiveTab,
    handleJobAction,
    jobPage,
    setJobPage,
    jobTotalPages
}: JobsTabProps) {
    return (
        <div className={styles.list}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-xl font-bold">{t.admin.jobs?.title || "All Jobs Management"}</h2>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        placeholder={t.admin.jobs?.searchPlaceholder || "User Search (Nickname/Email)"}
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm w-full sm:w-64"
                    />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm whitespace-nowrap"
                    >
                        <option value="">{t.admin.jobs?.filter?.all || "All Status"}</option>
                        <option value="QUEUED">{t.admin.jobs?.filter?.queued || "Queued"}</option>
                        <option value="RUNNING">{t.admin.jobs?.filter?.running || "Running"}</option>
                        <option value="DONE">{t.admin.jobs?.filter?.done || "Done"}</option>
                        <option value="FAILED">{t.admin.jobs?.filter?.failed || "Failed"}</option>
                        <option value="CANCELED">{t.admin.jobs?.filter?.canceled || "Canceled"}</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded text-sm bg-white cursor-pointer select-none whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={reportedOnly}
                            onChange={(e) => setReportedOnly(e.target.checked)}
                            className="w-4 h-4"
                        />
                        {t.admin.jobs?.filter?.reportedOnly || "View Reported Only"}
                    </label>
                    <button onClick={fetchJobs} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm whitespace-nowrap">
                        {t.admin.jobs?.action?.refresh || "Refresh"}
                    </button>
                </div>
            </div>
            <table className="w-full table-fixed text-left border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-gray-500 uppercase font-black text-[10px] tracking-wider">
                        <th className="px-4 py-3 w-20 text-center">{t.admin.jobs?.table?.image || "Image"}</th>
                        <th className="px-4 py-3">{t.admin.jobs?.table?.jobInfo || "Job Info"}</th>
                        <th className="px-4 py-3 w-40">{t.admin.jobs?.table?.user || "User"}</th>
                        <th className="px-4 py-3 w-28 text-center">{t.admin.jobs?.table?.status || "Status"}</th>
                        <th className="px-4 py-3 w-20 text-right">Cost</th>
                        <th className="px-4 py-3 w-20 text-right">Tokens</th>
                        <th className="px-4 py-3 w-40">{t.admin.jobs?.table?.dates || "Dates"}</th>
                        <th className="px-4 py-3 w-64 text-right">{t.admin.jobs?.table?.actions || "Actions"}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden relative mx-auto border border-gray-100 shadow-sm">
                                    {job.previewImageUrl || job.sourceImageUrl ? (
                                        <img src={job.previewImageUrl || job.sourceImageUrl} alt="job" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-300 text-[10px] font-bold">{t.admin.jobs?.table?.noImage || "NO IMG"}</div>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-2 min-w-0">
                                <div
                                    className="font-black text-sm text-gray-900 leading-tight mb-1 truncate"
                                    title={job.title || (t.admin.jobs?.table?.untitledJob || "Untitled Job")}
                                >
                                    {job.title || (t.admin.jobs?.table?.untitledJob || "Untitled Job")}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono tracking-tight truncate" title={job.id}>
                                    {job.id}
                                </div>
                            </td>
                            <td className="px-4 py-2 min-w-0">
                                <div className="text-sm font-bold text-gray-800 truncate mb-0.5">{job.userInfo?.nickname || (t.admin.jobs?.table?.unknownUser || "Unknown")}</div>
                                <div className="text-[10px] text-gray-400 truncate opacity-70">{job.userInfo?.email || job.userId}</div>
                            </td>
                            <td className="px-4 py-2 text-center">
                                <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black tracking-tight border
                                    ${job.status === 'DONE' ? 'bg-green-50 text-green-700 border-green-200' :
                                        job.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                                            job.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {job.status}
                                </span>
                                <div className="text-[9px] font-bold text-gray-400 mt-1.5 uppercase tracking-wider truncate" title={job.stage}>
                                    {job.stage}
                                </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                                <div className="text-xs font-bold text-gray-700">
                                    {job.estCost ? `$${job.estCost.toFixed(4)}` : "-"}
                                </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                                <div className="text-xs font-mono text-gray-500">
                                    {job.tokenCount ? job.tokenCount.toLocaleString() : "-"}
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60"></span>
                                        {new Date(job.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 opacity-60"></span>
                                        {new Date(job.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2 flex-wrap">
                                    <button
                                        onClick={() => setTraceJobId(job.id)}
                                        className="text-xs text-gray-600 hover:text-black font-medium px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 whitespace-nowrap"
                                    >
                                        HISTORY
                                    </button>
                                    <button
                                        onClick={() => setConclusionJobId(job.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 border border-indigo-100 rounded bg-indigo-50/30 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                                    >
                                        CONCLUSION
                                    </button>
                                    {job.status === 'DONE' && (
                                        <button
                                            onClick={() => {
                                                setTargetVerifyJobId(job.id);
                                                setActiveTab("brick-judge");
                                            }}
                                            className="text-xs text-green-600 hover:text-green-800 font-bold px-2 py-1 border border-green-100 rounded bg-green-50/30 hover:bg-green-50 transition-colors whitespace-nowrap"
                                        >
                                            VERIFY
                                        </button>
                                    )}
                                    {(job.status === 'FAILED' || job.status === 'CANCELED') && (
                                        <button
                                            onClick={() => handleJobAction(job.id, 'retry')}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 whitespace-nowrap"
                                        >
                                            {t.admin.jobs?.action?.retry || "Retry"}
                                        </button>
                                    )}
                                    {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                                        <button
                                            onClick={() => handleJobAction(job.id, 'cancel')}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50 whitespace-nowrap"
                                        >
                                            {t.admin.jobs?.action?.cancel || "Cancel"}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {jobs.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">{t.admin.jobs?.empty || "No jobs found."}</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {/* Pagination for Jobs */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-lg">
                <button
                    disabled={jobPage === 0}
                    onClick={() => setJobPage((p: number) => p - 1)}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                >
                    {t.admin.jobs?.pagination?.previous || "Previous"}
                </button>
                <span className="text-xs text-gray-500">{t.admin.jobs?.pagination?.page || "Page"} {jobPage + 1} {t.admin.jobs?.pagination?.of || "of"} {jobTotalPages || 1}</span>
                <button
                    disabled={jobPage >= jobTotalPages - 1}
                    onClick={() => setJobPage((p: number) => p + 1)}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                >
                    {t.admin.jobs?.pagination?.next || "Next"}
                </button>
            </div>
        </div>
    );
}
