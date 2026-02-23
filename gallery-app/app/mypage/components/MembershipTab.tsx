'use client';

import React from "react";
import styles from "../MyPage.module.css";

interface MembershipTabProps {
    t: any;
    profile: any;
    isCancelModalOpen: boolean;
    setIsCancelModalOpen: (v: boolean) => void;
    isCancelling: boolean;
    handleCancelMembership: () => void;
}

export default function MembershipTab({
    t,
    profile,
    isCancelModalOpen,
    setIsCancelModalOpen,
    isCancelling,
    handleCancelMembership,
}: MembershipTabProps) {
    return (
        <div className={styles.mypage__section}>
            <h2 className={styles.mypage__sectionTitle}>{t.membership.title}</h2>
            {profile && (
                <div className={styles.mypage__card}>
                    <span className={`${styles.mypage__roleBadge} ${styles.mypage__roleBadgeLarge}`}>
                        {profile.membershipPlan}
                    </span>
                    <p className={styles.mypage__planDesc}>
                        {t.membership.desc?.replace("{plan}", profile.membershipPlan)}
                    </p>

                    {/* 멤버십 해지 버튼 (무료 플랜이 아닐 경우에만 표시 예시 - 여기선 조건 없이 표시하거나 플랜 체크) */}
                    {profile.membershipPlan !== 'FREE' && (
                        <div className={styles.mypage__membershipActionArea}>
                            <button
                                className={styles.mypage__textBtn}
                                onClick={() => setIsCancelModalOpen(true)}
                            >
                                {t.membership.cancelBtn || "멤버십 해지 / 환불 신청"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 멤버십 해지 확인 모달 */}
            {isCancelModalOpen && (
                <div className={styles.mypage__modalOverlay} onClick={() => setIsCancelModalOpen(false)}>
                    <div className={styles.mypage__menuModal} style={{ padding: '32px', maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                            {t.membership.cancelTitle || "멤버십 해지"}
                        </h3>
                        <p style={{ marginBottom: '24px', color: '#666', lineHeight: 1.5 }}>
                            {t.membership.cancelConfirm || "정말로 멤버십을 해지하시겠습니까?\n해지 후에는 혜택을 더 이상 이용하실 수 없습니다."}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                className={styles.mypage__cancelBtn}
                                onClick={() => setIsCancelModalOpen(false)}
                                style={{ flex: 1 }}
                            >
                                {t.common.cancel || "취소"}
                            </button>
                            <button
                                className={styles.mypage__saveBtn}
                                style={{ flex: 1, backgroundColor: '#ff4d4f' }}
                                onClick={handleCancelMembership}
                                disabled={isCancelling}
                            >
                                {isCancelling ? "처리중..." : (t.common.confirm || "해지하기")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
