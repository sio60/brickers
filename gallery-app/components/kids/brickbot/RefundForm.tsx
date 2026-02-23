'use client';

import React from "react";
import type { ChatTranslation } from "./translations";
import styles from "../BrickBotModal.module.css";

interface RefundFormProps {
    tChat: ChatTranslation;
    refundList: any[];
    selectedOrderId: string | null;
    setSelectedOrderId: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}

export default function RefundForm({
    tChat,
    refundList,
    selectedOrderId,
    setSelectedOrderId,
    isSubmitting,
    onSubmit,
    onCancel,
}: RefundFormProps) {
    return (
        <>
            <h3 className={styles.formTitle}>{tChat.refund.modeTitle}</h3>
            <p className={styles.formDesc}>{tChat.refund.desc}</p>
            <div className={styles.refundList}>
                {refundList.length === 0 ? (
                    <div className={styles.refundEmpty}>{tChat.refund.empty}</div>
                ) : (
                    refundList.map((item) => (
                        <div
                            key={item.orderId}
                            onClick={() => setSelectedOrderId(item.orderId)}
                            className={`${styles.refundItem} ${selectedOrderId === item.orderId ? styles.selected : ''}`}
                        >
                            <div>
                                <div className={styles.refundItemName}>{item.planName}</div>
                                <div className={styles.refundItemMeta}>
                                    {(item.paidAt || item.createdAt)?.split("T")[0]} &bull; {item.amount}원
                                </div>
                            </div>
                            {selectedOrderId === item.orderId && <div className={styles.refundCheck}>&#10004;</div>}
                        </div>
                    ))
                )}
            </div>
            <div className={styles.formActions}>
                <button onClick={onCancel} className={styles.cancelBtn}>{tChat.cancel}</button>
                <button onClick={onSubmit} disabled={isSubmitting || !selectedOrderId} className={styles.submitBtn}>
                    {isSubmitting ? "..." : tChat.refund.btn}
                </button>
            </div>
        </>
    );
}
