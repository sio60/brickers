import React from "react";
import styles from "../../app/admin/AdminPage.module.css"; // kept for ::before pseudo-element
import { useAdminReports } from "@/hooks/admin/useAdminReports";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Report {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    details: string;
    status: string;
    createdAt: string;
    createdBy: string;
    reporterEmail?: string;
    resolutionNote?: string;
}

export default function ReportsTab() {
    const { t } = useLanguage();
    const {
        reports,
        answerTexts,
        setAnswerTexts,
        handleReportResolve,
    } = useAdminReports();

    const statusBadgeClass = (status: string) => {
        const base = "px-3 py-1 rounded text-[11px] font-extrabold uppercase border border-black";
        if (status === "OPEN" || status === "PENDING") return `${base} bg-white text-black`;
        if (status === "ANSWERED" || status === "RESOLVED") return `${base} bg-black text-white`;
        if (status === "CLOSED" || status === "REJECTED") return `${base} bg-[#eee] text-[#666] border-[#ddd]`;
        return base;
    };

    return (
        <div className="flex flex-col border-t-2 border-black">
            {reports.map(item => (
                <div key={item.id} className="flex flex-col gap-4 py-6 px-2 bg-white border-b border-[#eee] transition-colors hover:bg-[#fcfcfc]">
                    <div className="[&_h4]:m-0 [&_h4]:mb-3 [&_h4]:flex [&_h4]:items-center [&_h4]:justify-between [&_h4]:text-base [&_h4]:font-extrabold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[#444] [&_p]:m-0">
                        <h4>
                            {item.reason}
                            <span className={statusBadgeClass(item.status)}>
                                {item.status}
                            </span>
                        </h4>
                        <p>{item.details}</p>
                        <div className="text-xs text-[#999] mt-2">
                            {t.admin.label.target}: {item.targetType}({item.targetId}) •
                            {t.admin.label.reporter}: {item.reporterEmail || item.createdBy} •
                            {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="pt-4 mt-0 border-t border-dashed border-[#eee]">
                        {item.status !== "PENDING" ? (
                            <div className={`${styles.answerActive} bg-transparent pt-4 pl-5 pr-0 pb-0 rounded-none border-none relative`}>
                                <div className="text-[10px] font-black text-black bg-transparent border border-black inline-block px-2 py-0.5 rounded mb-2">
                                    {item.status === "RESOLVED" ? t.admin.report.actionComplete : t.admin.report.actionRejected}
                                </div>
                                <div className="text-sm leading-relaxed text-black font-normal">{item.resolutionNote}</div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 [&_textarea]:w-full [&_textarea]:min-h-[100px] [&_textarea]:p-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black [&_textarea]:font-[inherit] [&_textarea]:text-sm [&_textarea]:resize-none [&_textarea]:bg-white focus:[&_textarea]:outline-none focus:[&_textarea]:shadow-none focus:[&_textarea]:border-[#ffe135] [&_button]:self-end [&_button]:py-2.5 [&_button]:px-6 [&_button]:bg-black [&_button]:text-white [&_button]:border-none [&_button]:rounded-lg [&_button]:text-[13px] [&_button]:font-extrabold [&_button]:cursor-pointer [&_button]:transition-all [&_button]:duration-200 hover:[&_button]:-translate-y-0.5 hover:[&_button]:bg-[#ffe135] hover:[&_button]:text-black">
                                <textarea
                                    placeholder={t.admin.report.placeholder}
                                    value={answerTexts[item.id] || ""}
                                    onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                />
                                <div className="flex gap-2 self-end">
                                    <button
                                        className="!bg-[#eee] !text-black"
                                        onClick={() => handleReportResolve(item.id, false)}
                                    >
                                        {t.admin.report.reject}
                                    </button>
                                    <button onClick={() => handleReportResolve(item.id, true)}>
                                        {t.admin.report.resolve}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {reports.length === 0 && <p className="text-center text-[#999] py-10 text-sm">{t.admin.report.empty}</p>}
        </div>
    );
}
