import React from "react";
import styles from "../../app/admin/AdminPage.module.css";

export interface Inquiry {
    id: string;
    title: string;
    content: string;
    status: string;
    createdAt: string;
    userId: string;
    userEmail?: string;
    answer?: {
        content: string;
        answeredAt: string;
    };
}

interface InquiriesTabProps {
    t: any;
    inquiries: Inquiry[];
    answerTexts: Record<string, string>;
    setAnswerTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleAnswerSubmit: (id: string) => void;
}

export default function InquiriesTab({
    t,
    inquiries,
    answerTexts,
    setAnswerTexts,
    handleAnswerSubmit
}: InquiriesTabProps) {
    return (
        <div className={styles.list}>
            {inquiries.map(item => (
                <div key={item.id} className={`${styles.listItem} ${styles.inquiry}`}>
                    <div className={styles.inquiryMain}>
                        <h4>
                            {item.title}
                            <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                {item.status}
                            </span>
                        </h4>
                        <p>{item.content}</p>
                        <div className={styles.meta}>
                            {item.userEmail || item.userId} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                    </div>

                    <div className={styles.answerSection}>
                        {item.answer ? (
                            <div className={`${styles.answer} ${styles.active}`}>
                                <div className={styles.answerLabel}>{t.admin.inquiry.adminAnswer}</div>
                                <div className={styles.answerContent}>{item.answer.content}</div>
                                <div className={styles.answerDate}>
                                    {new Date(item.answer.answeredAt).toLocaleString()}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.answerForm}>
                                <textarea
                                    placeholder={t.admin.inquiry.placeholder}
                                    value={answerTexts[item.id] || ""}
                                    onChange={(e) => setAnswerTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                />
                                <button onClick={() => handleAnswerSubmit(item.id)}>
                                    {t.admin.inquiry.submit}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {inquiries.length === 0 && <p className={styles.emptyMsg}>{t.admin.inquiry.empty}</p>}
        </div>
    );
}
