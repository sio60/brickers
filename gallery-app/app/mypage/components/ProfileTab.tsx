'use client';

import React from "react";
import styles from "../MyPage.module.css";
import { Icons } from "./Icons";

interface ProfileTabProps {
    t: any;
    profile: any;
    data: any;
    isEditing: boolean;
    editNickname: string;
    setEditNickname: (v: string) => void;
    editBio: string;
    setEditBio: (v: string) => void;
    saving: boolean;
    startEditing: () => void;
    cancelEditing: () => void;
    saveProfile: () => void;
    formatDate: (d: string) => string;
}

export default function ProfileTab({
    t,
    profile,
    data,
    isEditing,
    editNickname,
    setEditNickname,
    editBio,
    setEditBio,
    saving,
    startEditing,
    cancelEditing,
    saveProfile,
    formatDate,
}: ProfileTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{t.profile.title}</h2>

            {profile && (
                <div className={styles.mypage__profileDashboard}>
                    <div className={styles.mypage__profileCard}>
                        <div className={styles.mypage__avatarArea}>
                            <img
                                src={profile.profileImage || "/default-avatar.png"}
                                alt="Profile"
                                className={styles.mypage__avatar}
                            />
                        </div>
                        <div className={styles.mypage__profileInfo}>
                            <div className={styles.mypage__nameRow}>
                                {!isEditing ? (
                                    <>
                                        <h3 className={styles.mypage__nickname}>{profile.nickname}</h3>
                                        <span className={styles.mypage__roleBadge}>{profile.membershipPlan}</span>
                                    </>
                                ) : (
                                    <input
                                        className={`${styles.mypage__formInput} ${styles.mypage__nicknameInput}`}
                                        value={editNickname}
                                        onChange={(e) => setEditNickname(e.target.value)}
                                        placeholder={t.profile.nickname}
                                    />
                                )}
                            </div>
                            <p className={styles.mypage__email}>{profile.email}</p>

                            {!isEditing ? (
                                <div className={styles.mypage__bioBox}>
                                    {profile.bio || t.mypage.bioPlaceholder}
                                </div>
                            ) : (
                                <textarea
                                    className={styles.mypage__formTextarea}
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    placeholder={t.mypage.bioPlaceholder}
                                />
                            )}

                            {!isEditing ? (
                                <button className={styles.mypage__editBtn} onClick={startEditing}>
                                    <Icons.Edit /> {t.profile.editBtn}
                                </button>
                            ) : (
                                <div className={styles.mypage__editActions}>
                                    <button className={styles.mypage__cancelBtn} onClick={cancelEditing}>{t.common.cancel}</button>
                                    <button className={styles.mypage__saveBtn} onClick={saveProfile} disabled={saving}>{t.common.confirm}</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.mypage__statsGrid}>
                        <div className={styles.mypage__statCard}>
                            <div className={styles.stat__header}>
                                <span className={styles.stat__label}>{t.mypage.stats.jobs}</span>
                            </div>
                            <span className={styles.stat__value}>{data?.jobs.totalCount || 0}</span>
                        </div>
                        <div className={styles.mypage__statCard}>
                            <div className={styles.stat__header}>
                                <span className={styles.stat__label}>{t.mypage.stats.gallery}</span>
                            </div>
                            <span className={styles.stat__value}>{data?.gallery.totalCount || 0}</span>
                        </div>
                        <div className={styles.mypage__statCard}>
                            <div className={styles.stat__header}>
                                <span className={styles.stat__label}>{t.mypage.stats.joinedAt}</span>
                            </div>
                            <span className={`${styles.stat__value} ${styles.stat__valueDate}`}>
                                {profile.createdAt ? formatDate(profile.createdAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
