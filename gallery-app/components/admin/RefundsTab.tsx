import React, { ChangeEvent } from "react";
import styles from "../../app/admin/AdminPage.module.css";

export interface RefundRequest {
    id: string;
    orderId: string;
    orderNo: string;
    amount: number;
    status: string;
    requestedAt: string;
    userId: string;
    itemName?: string;
    cancelReason?: string;
    createdAt: string;
    updatedAt: string;
}

interface RefundsTabProps {
    t: any;
    refunds: RefundRequest[];
    answerTexts: Record<string, string>;
    setAnswerTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleRefundApprove: (orderId: string) => void;
    handleRefundReject: (orderId: string) => void;
}

export default function RefundsTab({
    t,
    refunds,
    answerTexts,
    setAnswerTexts,
    handleRefundApprove,
    handleRefundReject
}: RefundsTabProps) {
    return (
        <div className={styles.list}>
            {refunds.map(item => (
                <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                    <div className={styles.inquiryMain}>
                        <h4>
                            {t.admin.refund.orderNo}: {item.orderNo}
                            <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                {item.status}
                            </span>
                        </h4>
                        <p>
                            {item.itemName && <><strong>{t.admin.refund.planName}:</strong> {item.itemName}<br /></>}
                            <strong>{t.admin.refund.amount}:</strong> {item.amount?.toLocaleString()}
                        </p>
                        {item.cancelReason && (
                            <p><strong>{t.admin.refund.reason}:</strong> {item.cancelReason}</p>
                        )}
                        <div className={styles.meta}>
                            {t.admin.refund.user}: {item.userId} • {t.admin.refund.requestDate}: {new Date(item.requestedAt).toLocaleDateString()}
                        </div>
                    </div>

                    <div className={styles.answerSection}>
                        <div className={styles.answerForm}>
                            <textarea
                                placeholder={t.admin.refund.rejectReason}
                                value={answerTexts[item.orderId] || ""}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAnswerTexts(prev => ({ ...prev, [item.orderId]: e.target.value }))}
                            />
                            <div className={styles.actions}>
                                <button
                                    className={styles.rejectBtn}
                                    onClick={() => handleRefundReject(item.orderId)}
                                >
                                    {t.admin.refund.reject}
                                </button>
                                <button onClick={() => handleRefundApprove(item.orderId)}>
                                    {t.admin.refund.approve}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {refunds.length === 0 && <p className={styles.emptyMsg}>{t.admin.refund.empty}</p>}
        </div>
    );
}
