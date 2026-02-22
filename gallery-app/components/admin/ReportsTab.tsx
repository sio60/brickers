import React from "react";
import styles from "../../app/admin/AdminPage.module.css";

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

interface ReportsTabProps {
    t: any;
    reports: Report[];
    answerTexts: Record<string, string>;
    setAnswerTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleReportResolve: (id: string, approve: boolean) => void;
}

export default function ReportsTab({
    t,
    reports,
    answerTexts,
    setAnswerTexts,
    handleReportResolve
}: ReportsTabProps) {
    return (
        <div className={styles.list}>
            {reports.map(item => (
                <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                    <div className={styles.inquiryMain}>
                        <h4>
                            {item.reason}
                            <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                {item.status}
                            </span>
                        </h4>
                        <p>{item.details}</p>
                        <div className={styles.meta}>
                            {t.admin.label.target}: {item.targetType}({item.targetId}) •
                            {t.admin.label.reporter}: {item.reporterEmail || item.createdBy} •
                            {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                    </div>

                    <div className={styles.answerSection}>
                        {item.status !== "PENDING" ? (
                            <div className={`${styles.answer} ${styles.active}`}>
                                <div className={styles.answerLabel}>
                                    {item.status === "RESOLVED" ? t.admin.report.actionComplete : t.admin.report.actionRejected}
                                </div>
                                <div className={styles.answerContent}>{item.resolutionNote}</div>
                            </div>
                        ) : (
                            <div className={styles.answerForm}>
                                <textarea
                                    placeholder={t.admin.report.placeholder}
                                    value={answerTexts[item.id] || ""}
                                    onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                />
                                <div className={styles.actions}>
                                    <button
                                        className={styles.rejectBtn}
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
            {reports.length === 0 && <p className={styles.emptyMsg}>{t.admin.report.empty}</p>}
        </div>
    );
}
