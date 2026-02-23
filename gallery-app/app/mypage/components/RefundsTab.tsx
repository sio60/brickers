'use client';

import React from "react";
import styles from "../MyPage.module.css";

interface RefundsTabProps {
    t: any;
    refundOrders: any[];
    refundLoading: boolean;
    getRefundStatusLabel: (s: string) => string;
    getRefundStatusClass: (s: string) => string;
    formatDate: (d: string) => string;
}

export default function RefundsTab({
    t,
    refundOrders,
    refundLoading,
    getRefundStatusLabel,
    getRefundStatusClass,
    formatDate,
}: RefundsTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{(t as any).refunds.title}</h2>
            <div className={styles.mypage__inquiriesList}>
                {refundLoading ? (
                    <p className={styles.mypage__loadingText}>{t.common.loading}...</p>
                ) : refundOrders.length > 0 ? (
                    refundOrders.map((order: any) => (
                        <div key={order.orderId} className={styles.mypage__inquiryCard}>
                            <div className={styles.inquiry__header}>
                                <span className={`${styles.inquiry__statusBadge} ${getRefundStatusClass(order.status)}`}>
                                    {getRefundStatusLabel(order.status)}
                                </span>
                                <span className={styles.inquiry__date}>
                                    {formatDate(order.paidAt || order.createdAt)}
                                </span>
                            </div>
                            <h3 className={styles.inquiry__title}>
                                {order.planName || "Unknown Plan"}
                            </h3>
                            <p className={styles.refund__amount}>
                                {order.amount?.toLocaleString()}원
                            </p>
                            {order.cancelReason && (
                                <div className={styles.refund__reasonBox}>
                                    {(t as any).refunds.cancelReason}: {order.cancelReason}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className={styles.mypage__empty}>{(t as any).refunds.empty}</p>
                )}
            </div>
        </div>
    );
}
