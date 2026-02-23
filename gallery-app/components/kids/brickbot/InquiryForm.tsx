'use client';

import React from "react";
import type { ChatTranslation } from "./translations";
import styles from "../BrickBotModal.module.css";

interface InquiryFormProps {
    tChat: ChatTranslation;
    formTitle: string;
    setFormTitle: (v: string) => void;
    formContent: string;
    setFormContent: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}

export default function InquiryForm({
    tChat,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    isSubmitting,
    onSubmit,
    onCancel,
}: InquiryFormProps) {
    return (
        <>
            <h3 className={styles.formTitle}>{tChat.inquiry.modeTitle}</h3>
            <input
                className={styles.formInput}
                placeholder={tChat.inquiry.titlePlace}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
            />
            <textarea
                className={styles.formTextarea}
                placeholder={tChat.inquiry.contentPlace}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
            />
            <div className={styles.formActions}>
                <button onClick={onCancel} className={styles.cancelBtn}>{tChat.cancel}</button>
                <button onClick={onSubmit} disabled={isSubmitting} className={styles.submitBtn}>
                    {isSubmitting ? "..." : tChat.inquiry.btn}
                </button>
            </div>
        </>
    );
}
