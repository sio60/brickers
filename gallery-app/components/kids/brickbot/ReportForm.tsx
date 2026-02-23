'use client';

import React from "react";
import type { ChatTranslation } from "./translations";
import styles from "../BrickBotModal.module.css";

interface ReportFormProps {
    tChat: ChatTranslation;
    formContent: string;
    setFormContent: (v: string) => void;
    reportReason: string;
    setReportReason: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}

export default function ReportForm({
    tChat,
    formContent,
    setFormContent,
    reportReason,
    setReportReason,
    isSubmitting,
    onSubmit,
    onCancel,
}: ReportFormProps) {
    return (
        <>
            <h3 className={styles.formTitle}>{tChat.report.modeTitle}</h3>
            <div className={styles.formField}>
                <label className={styles.formLabel}>{tChat.report.reasonLabel}</label>
                <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className={styles.formSelect}
                >
                    <option value="SPAM">{tChat.report.reasons.SPAM}</option>
                    <option value="INAPPROPRIATE">{tChat.report.reasons.INAPPROPRIATE}</option>
                    <option value="ABUSE">{tChat.report.reasons.ABUSE}</option>
                    <option value="COPYRIGHT">{tChat.report.reasons.COPYRIGHT}</option>
                    <option value="OTHER">{tChat.report.reasons.OTHER}</option>
                </select>
            </div>
            <textarea
                className={styles.formTextarea}
                placeholder={tChat.report.contentPlace}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
            />
            <div className={styles.formActions}>
                <button onClick={onCancel} className={styles.cancelBtn}>{tChat.cancel}</button>
                <button onClick={onSubmit} disabled={isSubmitting} className={styles.reportBtn}>
                    {isSubmitting ? "..." : tChat.report.btn}
                </button>
            </div>
        </>
    );
}
