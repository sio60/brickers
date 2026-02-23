'use client';

import React from "react";
import styles from "../MyPage.module.css";

interface InquiriesTabProps {
    t: any;
    inquiries: any[];
    listLoading: boolean;
    expandedInquiryId: string | null;
    setExpandedInquiryId: (id: string | null) => void;
    getInquiryStatusLabel: (s: string) => string;
    formatDate: (d: string) => string;
}

export default function InquiriesTab({
    t,
    inquiries,
    listLoading,
    expandedInquiryId,
    setExpandedInquiryId,
    getInquiryStatusLabel,
    formatDate,
}: InquiriesTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{t.inquiries.title}</h2>
            <div className={styles.mypage__inquiriesList}>
                {listLoading ? (
                    <p className={styles.mypage__loadingText}>{t.common.loading}...</p>
                ) : inquiries.length > 0 ? (
                    inquiries.map((inquiry: any) => (
                        <div
                            key={inquiry.id}
                            className={styles.mypage__inquiryCard}
                            onClick={() => setExpandedInquiryId(expandedInquiryId === inquiry.id ? null : inquiry.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.inquiry__header}>
                                <span className={`${styles.inquiry__statusBadge} ${inquiry.status === 'ANSWERED' ? styles.answered : ''}`}>
                                    {getInquiryStatusLabel(inquiry.status)}
                                </span>
                                <span className={styles.inquiry__date}>{formatDate(inquiry.createdAt)}</span>
                            </div>
                            <h3 className={styles.inquiry__title}>{inquiry.title}</h3>

                            {expandedInquiryId === inquiry.id && (
                                <div className={styles.inquiry__expand}>
                                    <p className={styles.inquiry__content}>{inquiry.content}</p>
                                    {inquiry.answer && (
                                        <div className={styles.inquiry__answer}>
                                            <strong>{t.inquiries.adminAnswer}:</strong> {typeof inquiry.answer === 'string' ? inquiry.answer : inquiry.answer?.content}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className={styles.mypage__empty}>{t.inquiries.empty}</p>
                )}
            </div>
        </div>
    );
}
