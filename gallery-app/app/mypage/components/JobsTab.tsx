'use client';

import React from "react";
import styles from "../MyPage.module.css";
import { Icons } from "./Icons";

interface JobsTabProps {
    t: any;
    jobsList: any[];
    jobsLoading: boolean;
    jobSort: 'latest' | 'oldest';
    setJobSort: (v: 'latest' | 'oldest') => void;
    handleJobClick: (job: any) => void;
    handleCancelJob: (jobId: string) => void;
    formatDate: (d: string) => string;
    getStatusLabel: (s: string) => string;
    getStatusClass: (s: string) => string;
    jobsSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export default function JobsTab({
    t,
    jobsList,
    jobsLoading,
    jobSort,
    setJobSort,
    handleJobClick,
    handleCancelJob,
    formatDate,
    getStatusLabel,
    getStatusClass,
    jobsSentinelRef,
}: JobsTabProps) {
    return (
        <div className={styles.mypage__section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 className={styles.mypage__sectionTitle}>{t.jobs.title}</h2>
                <select
                    value={jobSort}
                    onChange={(e) => setJobSort(e.target.value as 'latest' | 'oldest')}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '2px solid #000',
                        fontWeight: 700,
                        background: '#fff',
                    }}
                >
                    <option value="latest">{t.jobs?.sortLatest || '최신순'}</option>
                    <option value="oldest">{t.jobs?.sortOldest || '오래된순'}</option>
                </select>
            </div>
            {jobsList.length > 0 ? (
                <div className={styles.mypage__jobs}>
                    {[...jobsList]
                        .sort((a, b) => jobSort === 'latest'
                            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((job) => (
                            <div
                                key={job.id}
                                className={styles.mypage__job}
                                onClick={() => handleJobClick(job)}
                            >
                                <div className={styles.mypage__jobThumbData} style={{ position: 'relative', overflow: 'hidden' }}>
                                    <img src={job.sourceImageUrl || "/placeholder.png"} alt={job.title} className={styles.mypage__jobThumb} />



                                    <div className={styles.mypage__jobOverlay}>
                                        <span className={`${styles.mypage__jobStatus} ${styles[getStatusClass(job.status)]}`}>
                                            {getStatusLabel(job.status)}
                                        </span>
                                    </div>
                                    <div className={styles.mypage__jobActionOverlay}>
                                        {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                                            <button
                                                className={styles.mypage__jobCancelBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancelJob(job.id);
                                                }}
                                                title={t.common.cancel}
                                            >
                                                <Icons.X width={16} height={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.mypage__jobInfo}>
                                    <div className={styles.mypage__jobTitle}>{job.title || "Untitled"}</div>
                                    <div className={styles.mypage__jobDate}>{formatDate(job.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    <div ref={jobsSentinelRef} style={{ height: 1 }} />
                </div>
            ) : (
                <p className={styles.mypage__empty}>{t.jobs.empty}</p>
            )}
            {jobsLoading && (
                <div style={{ marginTop: 16, fontWeight: 700 }}>{t.common.loading}...</div>
            )}
        </div>
    );
}
