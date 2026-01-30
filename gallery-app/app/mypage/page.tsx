"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./MyPage.module.css";
import { getMyOverview, getMyProfile, retryJob, updateMyProfile, ApiError } from "@/lib/api/myApi";
import type { MyOverview, MyProfile, MyJob } from "@/lib/api/myApi";
import Background3D from "@/components/three/Background3D";
// Dynamic imports for components if needed, or normal imports
import KidsLdrPreview from "@/components/kids/KidsLdrPreview";

// types
type MenuItem = "profile" | "membership" | "jobs" | "inquiries" | "reports" | "settings" | "delete";

export default function MyPage() {
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, isLoading, user, authFetch } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    // 문의/신고 내역 상태
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState(false);

    // 프로필 수정 관련 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [editBio, setEditBio] = useState("");
    const [saving, setSaving] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

    // 3D 뷰어 모달 상태
    const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/?login=true");
            return;
        }

        if (isAuthenticated) {
            setLoading(true);
            setError(null);

            Promise.all([getMyOverview(), getMyProfile()])
                .then(([overviewRes, profileRes]) => {
                    setData(overviewRes);
                    setProfile(profileRes);
                    setLoading(false);
                })
                .catch((err) => {
                    if (err instanceof ApiError) {
                        setError({ message: err.message, status: err.status });
                    } else {
                        setError({ message: err instanceof Error ? err.message : "Unknown Error", status: 0 });
                    }
                    setLoading(false);
                });
        }
    }, [language, isAuthenticated, isLoading]);

    // 수정 모드 진입 시 현재 값으로 초기화
    const startEditing = () => {
        if (profile) {
            setEditNickname(profile.nickname || "");
            setEditBio(profile.bio || "");
        }
        setIsEditing(true);
    };

    // 수정 취소
    const cancelEditing = () => {
        setIsEditing(false);
    };

    // 프로필 저장 (닉네임, 자기소개만)
    const saveProfile = async () => {
        try {
            setSaving(true);
            const updated = await updateMyProfile({
                nickname: editNickname,
                bio: editBio,
            });
            setProfile(updated);
            setIsEditing(false);
            alert(t.profile.alertSaved);
        } catch {
            alert(t.profile.alertFailed);
        } finally {
            setSaving(false);
        }
    };

    const handleRetry = async (jobId: string) => {
        try {
            setRetrying(jobId);
            await retryJob(jobId);
            const updated = await getMyOverview();
            setData(updated);
        } catch {
            alert(t.jobs.retryFail);
        } finally {
            setRetrying(null);
        }
    };

    const getStatusLabel = (status: MyJob["status"] | string) => {
        const statusMap: Record<string, string> = t.jobs.status || {};
        return statusMap[status] || status;
    };

    const getStatusClass = (status: MyJob["status"] | string) => {
        switch (status) {
            case "QUEUED": return "pending";
            case "RUNNING": return "running";
            case "CANCELED": return "paused"; // or canceled
            case "DONE": return "completed";
            case "FAILED": return "failed";
            default: return "";
        }
    };

    const getReportStatusLabel = (status: string) => {
        const labels: Record<string, string> = t.reports?.status || {};
        return labels[status] || status;
    };

    const getReportReasonLabel = (reason: string) => {
        const labels: Record<string, string> = t.reports?.reasons || {};
        return labels[reason] || reason;
    };

    const getReportTargetLabel = (type: string) => {
        const labels: Record<string, string> = t.reports?.targets || {};
        return labels[type] || type;
    };

    const getInquiryStatusLabel = (status: string) => {
        const labels: Record<string, string> = t.inquiries?.status || {};
        return labels[status] || status;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const menuItems = [
        { id: "profile" as MenuItem, label: t.menu.profile },
        { id: "membership" as MenuItem, label: t.menu.membership },
        { id: "jobs" as MenuItem, label: t.menu.jobs },
        { id: "inquiries" as MenuItem, label: t.menu.inquiries },
        { id: "reports" as MenuItem, label: t.menu.reports },
        { id: "settings" as MenuItem, label: t.menu.settings },
        { id: "delete" as MenuItem, label: t.menu.delete },
    ];

    // 실시간 업데이트 (Polling) 및 문의 내역 로드
    useEffect(() => {
        let intervalId: any;

        if (activeMenu === "jobs") {
            const fetchJobs = async () => {
                try {
                    const updated = await getMyOverview();
                    setData(updated);
                } catch (e) {
                    console.error("Polling failed", e);
                }
            };
            intervalId = setInterval(fetchJobs, 3000);
        }

        if (activeMenu === "inquiries") {
            fetchMyInquiries();
        }

        if (activeMenu === "reports") {
            fetchMyReports();
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeMenu]);

    const fetchMyInquiries = async () => {
        try {
            setListLoading(true);
            const res = await authFetch("/api/inquiries/my?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch inquiries", e);
        } finally {
            setListLoading(false);
        }
    };

    const fetchMyReports = async () => {
        try {
            setListLoading(true);
            const res = await authFetch("/api/reports/my?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setReports(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch reports", e);
        } finally {
            setListLoading(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className={styles.mypage__loading}>{t.common.loading}</div>;
        }

        if (error) {
            if (error.status === 401) {
                return (
                    <div className={styles.mypage__error}>
                        <p>{t.common.loginRequired}</p>
                        <button className={styles.mypage__loginBtn} onClick={() => router.push("/")}>
                            {t.common.homeBtn}
                        </button>
                    </div>
                );
            }

            return (
                <div className={styles.mypage__error}>
                    <p>{t.common.error}</p>
                    <p className={styles.mypage__errorMessage}>({error.message})</p>
                    <button className={styles.mypage__retryBtn} onClick={() => window.location.reload()}>
                        {t.common.retryBtn}
                    </button>
                </div>
            );
        }

        switch (activeMenu) {
            case "profile":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>
                            {isEditing ? t.profile.editTitle : t.profile.title}
                        </h2>
                        {profile && !isEditing && (
                            <div className={styles.mypage__profileDashboard}>
                                <div className={styles.mypage__profileHeader}>
                                    <div className={styles.mypage__avatarWrapper}>
                                        <img
                                            src={profile.profileImage || "/default-avatar.png"}
                                            alt={t.profile.imageAlt}
                                            className={styles.mypage__avatar}
                                        />
                                    </div>
                                    <div className={styles.mypage__headerInfo}>
                                        <div className={styles.mypage__nameGroup}>
                                            <h3 className={styles.mypage__nickname}>{profile.nickname || "User"}</h3>
                                            <span className={styles.mypage__roleBadge}>{profile.membershipPlan}</span>
                                        </div>
                                        <p className={styles.mypage__email}>{profile.email}</p>
                                        <p className={styles.mypage__bio}>{profile.bio || t.mypage.bioPlaceholder}</p>
                                        <button className={styles.mypage__editBtnSimple} onClick={startEditing}>
                                            {t.profile.editBtn}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.mypage__statsGrid}>
                                    <div className={styles.mypage__statCard}>
                                        <span className={styles.stat__label}>{t.mypage.stats?.jobs || "Jobs"}</span>
                                        <span className={styles.stat__value}>{data?.jobs.totalCount || 0}</span>
                                    </div>
                                    <div className={styles.mypage__statCard}>
                                        <span className={styles.stat__label}>{t.mypage.stats?.gallery || "Gallery"}</span>
                                        <span className={styles.stat__value}>{data?.gallery.totalCount || 0}</span>
                                    </div>
                                    <div className={styles.mypage__statCard}>
                                        <span className={styles.stat__label}>{t.mypage.stats?.joinedAt || "Joined At"}</span>
                                        <span className={styles.stat__value}>
                                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {profile && isEditing && (
                            <div className={styles.mypage__profileEditSection}>
                                <div className={`${styles.mypage__avatarWrapper} ${styles['edit-mode']}`}>
                                    <img
                                        src={profile.profileImage || "/default-avatar.png"}
                                        alt={t.profile.imageAlt}
                                        className={styles.mypage__avatar}
                                    />
                                </div>

                                <div className={styles.mypage__editContent}>
                                    <div className={styles.mypage__editForm}>
                                        <div className={styles.mypage__formRow}>
                                            <label className={styles.mypage__formLabel}>{t.profile.nickname}</label>
                                            <input
                                                type="text"
                                                className={styles.mypage__formInput}
                                                value={editNickname}
                                                onChange={(e) => setEditNickname(e.target.value)}
                                                placeholder={t.mypage.nicknamePlaceholder}
                                            />
                                        </div>
                                        <div className={styles.mypage__formRow}>
                                            <label className={styles.mypage__formLabel}>{t.profile.bio}</label>
                                            <textarea
                                                className={styles.mypage__formTextarea}
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                placeholder={t.mypage.bioInputPlaceholder}
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.mypage__editActions}>
                                        <button
                                            className={styles.mypage__cancelBtn}
                                            onClick={cancelEditing}
                                            disabled={saving}
                                        >
                                            {t.profile.cancelBtn}
                                        </button>
                                        <button
                                            className={styles.mypage__saveBtn}
                                            onClick={saveProfile}
                                            disabled={saving}
                                        >
                                            {saving ? t.profile.saving : t.profile.saveBtn}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "membership":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.membership.title}</h2>
                        {profile && (
                            <div className={styles.mypage__membershipCard}>
                                <div className={styles.mypage__planBadge}>{profile.membershipPlan}</div>
                                <p className={styles.mypage__planDesc}>
                                    {t.membership.desc?.replace("{plan}", profile.membershipPlan)}
                                </p>
                                {profile.membershipPlan === "FREE" && (
                                    <button
                                        className={styles.mypage__upgradeBtn}
                                        onClick={() => setShowUpgrade(true)}
                                    >
                                        {t.membership.upgradeBtn}
                                    </button>
                                )}
                                {profile.membershipPlan !== "FREE" && (
                                    <div className={styles.mypage__subInfo}>
                                        <div className={styles.mypage__infoRow}>
                                            <span className={styles.mypage__label}>{t.mypage.payment?.date || "Current"}</span>
                                            <span className={styles.mypage__value}>
                                                {new Date().toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className={styles.mypage__infoRow}>
                                            <span className={styles.mypage__label}>{t.mypage.payment?.nextDate || "Next"}</span>
                                            <span className={styles.mypage__value}>
                                                {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "jobs":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.jobs.title}</h2>
                        {data?.jobs.recent && data.jobs.recent.length > 0 ? (
                            <div className={styles.mypage__jobs}>
                                {data.jobs.recent.map((job) => (
                                    <div
                                        key={job.id}
                                        className={styles.mypage__job}
                                        onClick={() => {
                                            if (job.status === "DONE" && job.ldrUrl) {
                                                setSelectedJob(job);
                                            } else if (job.status === "FAILED") {
                                                alert(t.jobs.modalError + job.errorMessage);
                                            } else {
                                                alert(t.jobs.modalPending);
                                            }
                                        }}
                                    >
                                        <div className={styles.mypage__jobThumbData}>
                                            <img
                                                src={job.sourceImageUrl || "/placeholder.png"}
                                                alt={job.title}
                                                className={styles.mypage__jobThumb}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/placeholder.png";
                                                }}
                                            />
                                            {(job.status === "FAILED" || job.status === "CANCELED" || job.status === "QUEUED") && (
                                                <div className={styles.mypage__jobOverlay}>
                                                    <button
                                                        className={styles.mypage__retryBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRetry(job.id);
                                                        }}
                                                        disabled={retrying === job.id}
                                                    >
                                                        {retrying === job.id ? "..." : "↺"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.mypage__jobInfo}>
                                            <div className={styles.mypage__jobTitle}>{job.title || t.mypage.noTitle}</div>
                                            <div className={styles.mypage__jobMeta}>
                                                <span className={`${styles.mypage__jobStatus} ${styles[getStatusClass(job.status)]}`}>
                                                    {getStatusLabel(job.status)}
                                                </span>
                                                <span className={styles.mypage__jobDate}>
                                                    {formatDate(job.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.mypage__empty}>{t.jobs.empty}</p>
                        )}
                    </div>
                );

            case "inquiries":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.menu.inquiries}</h2>
                        <div className={styles.mypage__inquiriesList}>
                            {listLoading ? (
                                <p className={styles.mypage__loading}>{t.common.loading}</p>
                            ) : inquiries.length > 0 ? (
                                inquiries.map((iq) => (
                                    <div key={iq.id} className={styles.mypage__inquiryCard}>
                                        <div className={styles.inquiry__header}>
                                            <span className={`${styles.inquiry__status} ${styles[iq.status]}`}>
                                                {getInquiryStatusLabel(iq.status)}
                                            </span>
                                            <span className={styles.inquiry__date}>{new Date(iq.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className={styles.inquiry__title}>{iq.title}</h3>
                                        <p className={styles.inquiry__content}>{iq.content}</p>

                                        {iq.answer && (
                                            <div className={styles.inquiry__answer}>
                                                <div className={styles.answer__badge}>{t.inquiries?.adminAnswer}</div>
                                                <p className={styles.answer__text}>{iq.answer.content}</p>
                                                <span className={styles.answer__date}>{new Date(iq.answer.answeredAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.mypage__empty}>{t.inquiries?.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "reports":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.reports?.title}</h2>
                        <div className={styles.mypage__inquiriesList}>
                            {listLoading ? (
                                <p className={styles.mypage__loading}>{t.common.loading}</p>
                            ) : reports.length > 0 ? (
                                reports.map((rp) => (
                                    <div key={rp.id} className={`${styles.mypage__inquiryCard} ${styles['report-card']}`}>
                                        <div className={styles.inquiry__header}>
                                            <span className={`${styles.inquiry__status} ${styles[rp.status]}`}>
                                                {getReportStatusLabel(rp.status)}
                                            </span>
                                            <span className={styles.inquiry__date}>{new Date(rp.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.report__reason_group}>
                                            <span className={styles.report__target_badge}>{getReportTargetLabel(rp.targetType)}</span>
                                            <h3 className={styles.inquiry__title}>{getReportReasonLabel(rp.reason)}</h3>
                                        </div>
                                        <div className={styles.report__details}>
                                            <p className={styles.inquiry__content}>{rp.details}</p>
                                            <span className={styles.report__id_info}>{t.reports?.dataId}: {rp.targetId}</span>
                                        </div>

                                        {rp.resolutionNote && (
                                            <div className={styles.inquiry__answer}>
                                                <div className={styles.answer__badge}>{t.reports?.adminNote}</div>
                                                <p className={styles.answer__text}>{rp.resolutionNote}</p>
                                                {rp.resolvedAt && (
                                                    <span className={styles.answer__date}>{new Date(rp.resolvedAt).toLocaleString()}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.mypage__empty}>{t.reports?.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "settings":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.settings.title}</h2>
                        <div className={styles.mypage__settingsCard}>
                            <div className={styles.mypage__settingRow}>
                                <span>{t.settings.notification}</span>
                                <button className={styles.mypage__settingBtn}>{t.settings.changeBtn}</button>
                            </div>
                            <div className={styles.mypage__settingRow}>
                                <span>{t.settings.language}</span>
                                <div className={styles.mypage__langGroup}>
                                    <button
                                        className={`${styles.mypage__langBtn} ${language === "ko" ? styles.active : ""}`}
                                        onClick={() => setLanguage("ko")}
                                    >
                                        {t.settings.langKo}
                                    </button>
                                    <button
                                        className={`${styles.mypage__langBtn} ${language === "en" ? styles.active : ""}`}
                                        onClick={() => setLanguage("en")}
                                    >
                                        {t.settings.langEn}
                                    </button>
                                    <button
                                        className={`${styles.mypage__langBtn} ${language === "ja" ? styles.active : ""}`}
                                        onClick={() => setLanguage("ja")}
                                    >
                                        {t.settings.langJa}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "delete":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.delete.title}</h2>
                        <div className={styles.mypage__deleteCard}>
                            <p>{t.delete.desc}</p>
                            <button className={styles.mypage__deleteBtn}>{t.delete.btn}</button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`${styles.mypage} ${styles['lang-' + language]}`}>
            <Background3D entryDirection="float" />

            <div className={styles.mypage__container}>
                <div className={styles.mypage__layout}>
                    {/* 나가기 버튼 */}
                    <button className={styles.mypage__exitBtn} onClick={() => router.push("/")}>
                        ✕
                    </button>

                    {/* 왼쪽 사이드바 */}
                    <div className={styles.mypage__sidebar}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={`${styles.mypage__menuItem} ${activeMenu === item.id ? styles.active : ""}`}
                                onClick={() => setActiveMenu(item.id)}
                            >
                                <span className={styles.mypage__menuLabel}>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 오른쪽 컨텐츠 */}
                    <div className={styles.mypage__content}>
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* UpgradeModal - assuming it is implemented similar to frontend, 
                if we can't find it we'll omit it for now or check earlier tool output */}
            {/* <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} /> */}

            {/* 3D 뷰어 모달 */}
            {selectedJob && (
                <div className={styles.mypage__modalOverlay}>
                    <div className={styles.mypage__modalContent}>
                        <button
                            className={styles.mypage__closeBtn}
                            onClick={() => setSelectedJob(null)}
                        >
                            ✕
                        </button>
                        <div className={styles.mypage__viewerContainer}>
                            {selectedJob.ldrUrl ? (
                                <KidsLdrPreview
                                    url={selectedJob.ldrUrl}
                                    stepMode={true}
                                />
                            ) : (
                                <p>{t.jobs.modalNoData}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
