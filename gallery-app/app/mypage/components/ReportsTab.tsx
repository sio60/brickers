'use client';

import React from "react";
import styles from "../MyPage.module.css";
import { Icons } from "./Icons";

interface ReportsTabProps {
    t: any;
    reports: any[];
    listLoading: boolean;
    expandedReportId: string | null;
    setExpandedReportId: (id: string | null) => void;
    getReportStatusLabel: (s: string) => string;
    getReportReasonLabel: (r: string) => string;
    getReportTargetLabel: (type: string) => string;
    formatDate: (d: string) => string;
}

export default function ReportsTab({
    t,
    reports,
    listLoading,
    expandedReportId,
    setExpandedReportId,
    getReportStatusLabel,
    getReportReasonLabel,
    getReportTargetLabel,
    formatDate,
}: ReportsTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{t.reports.title}</h2>
            <div className={styles.mypage__inquiriesList}>
                {listLoading ? (
                    <p className={styles.mypage__loadingText}>{t.common.loading}...</p>
                ) : reports.length > 0 ? (
                    reports.map((report: any) => (
                        <div
                            key={report.id}
                            className={styles.mypage__inquiryCard}
                            onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.inquiry__header}>
                                <span className={`${styles.report__statusBadge} ${report.status === 'RESOLVED' ? styles.resolved : styles.pending}`}>
                                    {getReportStatusLabel(report.status)}
                                </span>
                                <span className={styles.inquiry__date}>{formatDate(report.createdAt)}</span>
                            </div>

                            <span className={styles.report__type}>{getReportTargetLabel(report.targetType)}</span>
                            <span className={styles.report__reason}>{getReportReasonLabel(report.reason)}</span>

                            <p className={styles.report__description}>
                                {report.details || report.description}
                            </p>
                            <div className={styles.report__dataId}>
                                {t.reports.dataId}: {report.targetId || report.dataId || "N/A"}
                            </div>

                            {expandedReportId === report.id && (report.resolutionNote || report.adminComment) && (
                                <div className={styles.report__adminAnswerBox}>
                                    <div className={styles.report__adminTitleBadge}>
                                        <Icons.CornerDownRight />
                                        {t.reports.adminNote}
                                    </div>
                                    <p className={styles.report__resolutionNote}>
                                        {report.resolutionNote || report.adminComment}
                                    </p>
                                    {report.resolvedAt && (
                                        <span className={styles.report__resolvedDate}>
                                            {formatDate(report.resolvedAt)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className={styles.mypage__empty}>{t.reports.empty}</p>
                )}
            </div>
        </div>
    );
}
