'use client';

import React from "react";
import styles from "../MyPage.module.css";

interface SettingsTabProps {
    t: any;
    language: string;
    setLanguage: (lang: "ko" | "en" | "ja") => void;
}

export default function SettingsTab({
    t,
    language,
    setLanguage,
}: SettingsTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{t.settings.title}</h2>
            <div className={styles.mypage__card}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Language Settings */}
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{t.settings.language}</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className={`${styles.mypage__btn3d} ${language === 'ko' ? styles.active : ''}`}
                                onClick={() => setLanguage('ko')}
                                style={{ backgroundColor: language === 'ko' ? '#FFD600' : '#fff' }}
                            >
                                {t.settings.langKo}
                            </button>
                            <button
                                className={`${styles.mypage__btn3d} ${language === 'en' ? styles.active : ''}`}
                                onClick={() => setLanguage('en')}
                                style={{ backgroundColor: language === 'en' ? '#FFD600' : '#fff' }}
                            >
                                {t.settings.langEn}
                            </button>
                            <button
                                className={`${styles.mypage__btn3d} ${language === 'ja' ? styles.active : ''}`}
                                onClick={() => setLanguage('ja')}
                                style={{ backgroundColor: language === 'ja' ? '#FFD600' : '#fff' }}
                            >
                                {t.settings.langJa}
                            </button>
                        </div>
                    </div>

                    {/* Notification Settings (Placeholder) */}
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{t.settings.notification}</h3>
                        <p style={{ color: '#666' }}>{t.jobs.settingsTbd}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
