'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    getMyOverview,
    getMyProfile,
    retryJob,
    updateMyProfile,
    getMyInquiries,
    getMyReports,
    MyOverview,
    MyProfile,
    MyJob,
    ApiError
} from "@/lib/api/myApi";
import styles from "./MyPage.module.css";
import Background3D from "@/components/three/Background3D";
import KidsLdrPreview from "@/components/kids/KidsLdrPreview";

type MenuItem = "profile" | "membership" | "jobs" | "inquiries" | "reports" | "settings" | "delete";

export default function MyPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading, user } = useAuth();
    const { language, setLanguage, t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    // List states
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState(false);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [editBio, setEditBio] = useState("");
    const [saving, setSaving] = useState(false);

    // Preview state
    const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/?login=true");
            return;
        }

        if (isAuthenticated) {
            setLoading(true);
            Promise.all([getMyOverview(), getMyProfile()])
                .then(([overviewRes, profileRes]) => {
                    setData(overviewRes);
                    setProfile(profileRes);
                })
                .catch((err) => {
                    if (err instanceof ApiError) {
                        setError({ message: err.message, status: err.status });
                    } else {
                        setError({ message: err instanceof Error ? err.message : "Unknown error", status: 0 });
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (activeMenu === "inquiries") {
            setListLoading(true);
            getMyInquiries()
                .then(res => setInquiries(res.content || []))
                .catch(console.error)
                .finally(() => setListLoading(false));
        } else if (activeMenu === "reports") {
            setListLoading(true);
            getMyReports()
                .then(res => setReports(res.content || []))
                .catch(console.error)
                .finally(() => setListLoading(false));
        }
    }, [activeMenu]);

    const startEditing = () => {
        if (profile) {
            setEditNickname(profile.nickname || "");
            setEditBio(profile.bio || "");
        }
        setIsEditing(true);
    };

    const saveProfile = async () => {
        try {
            setSaving(true);
            const updated = await updateMyProfile({
                nickname: editNickname,
                bio: editBio,
            });
            setProfile(updated);
            setIsEditing(false);
            alert(t.profile.alertSaved || "Profile saved!");
        } catch {
            alert(t.profile.alertFailed || "Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleRetry = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        try {
            setRetrying(jobId);
            await retryJob(jobId);
            const updated = await getMyOverview();
            setData(updated);
        } catch {
            alert(t.jobs.retryFail || "Retry failed.");
        } finally {
            setRetrying(null);
        }
    };

    const menuItems = [
        { id: "profile" as MenuItem, label: t.menu.profile },
        { id: "membership" as MenuItem, label: t.menu.membership },
        { id: "jobs" as MenuItem, label: t.menu.jobs || t.jobs?.title },
        { id: "inquiries" as MenuItem, label: t.menu.inquiries },
        { id: "reports" as MenuItem, label: t.menu.reports },
        { id: "settings" as MenuItem, label: t.menu.settings },
        { id: "delete" as MenuItem, label: t.menu.delete || t.delete?.title },
    ];

    const getStatusClass = (status: string) => {
        switch (status) {
            case "QUEUED": return styles.pending;
            case "RUNNING": return styles.running;
            case "DONE": return styles.completed;
            case "FAILED": return styles.failed;
            default: return "";
        }
    };

    const renderContent = () => {
        if (loading) return <div className={styles.loading}>{t.common.loading}</div>;
        if (error) return <div className={styles.error}>{error.message}</div>;

        switch (activeMenu) {
            case "profile":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{isEditing ? t.profile.editTitle : t.profile.title}</h2>
                        {profile && !isEditing && (
                            <div className={styles.profileDashboard}>
                                <div className={styles.profileHeader}>
                                    <div className={styles.avatarWrapper}>
                                        <img src={profile.profileImage || "/default-avatar.png"} alt="Avatar" className={styles.avatar} />
                                    </div>
                                    <div className={styles.headerInfo}>
                                        <div className={styles.nameGroup}>
                                            <h3 className={styles.nickname}>{profile.nickname || "User"}</h3>
                                            <span className={styles.roleBadge}>{profile.membershipPlan}</span>
                                        </div>
                                        <p className={styles.email}>{profile.email}</p>
                                        <p className={styles.bio}>{profile.bio || t.mypage?.bioPlaceholder || "No bio yet."}</p>
                                        <button className={styles.editBtnSimple} onClick={startEditing}>
                                            {t.profile.editBtn}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>{t.mypage.stats.jobs}</span>
                                        <span className={styles.statValue}>{data?.jobs.totalCount || 0}</span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>{t.mypage.stats.joinedAt}</span>
                                        <span className={styles.statValue}>
                                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {profile && isEditing && (
                            <div className={styles.profileEditSection}>
                                <div className={styles.editContent}>
                                    <div className={styles.editForm}>
                                        <div className={styles.formRow}>
                                            <label className={styles.formLabel}>{t.profile.nickname}</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={editNickname}
                                                onChange={(e) => setEditNickname(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.formRow}>
                                            <label className={styles.formLabel}>{t.profile.bio}</label>
                                            <textarea
                                                className={styles.formTextarea}
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.editActions}>
                                        <button className={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={saving}>
                                            {t.profile.cancelBtn}
                                        </button>
                                        <button className={styles.saveBtn} onClick={saveProfile} disabled={saving}>
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
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.membership?.title || "Membership"}</h2>
                        <div className={styles.membershipCard}>
                            <div className={styles.planBadge}>{profile?.membershipPlan}</div>
                            <p className={styles.planDesc}>{t.membership?.desc?.replace("{plan}", profile?.membershipPlan || "")}</p>
                        </div>
                    </div>
                );

            case "jobs":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.jobs?.title || "My Jobs"}</h2>
                        {data?.jobs.recent && data.jobs.recent.length > 0 ? (
                            <div className={styles.jobsGrid}>
                                {data.jobs.recent.map((job) => (
                                    <div key={job.id} className={styles.jobCard} onClick={() => {
                                        if (job.status === "DONE" && job.modelKey) setSelectedJob(job);
                                    }}>
                                        <div className={styles.jobThumbWrapper}>
                                            <img src={job.sourceImageUrl || "/placeholder.png"} alt={job.title} className={styles.jobThumb} />
                                            {job.status === "FAILED" && (
                                                <div className={styles.jobOverlay}>
                                                    <button className={styles.retryBtn} onClick={(e) => handleRetry(e, job.id)} disabled={retrying === job.id}>
                                                        {retrying === job.id ? "..." : "↺"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.jobInfo}>
                                            <div className={styles.jobName}>{job.title || "Untitled"}</div>
                                            <div className={styles.jobMeta}>
                                                <span className={`${styles.jobStatus} ${getStatusClass(job.status)}`}>
                                                    {t.jobs?.status?.[job.status] || job.status}
                                                </span>
                                                <span className={styles.jobDate}>{new Date(job.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.empty}>{t.jobs?.empty}</p>
                        )}
                    </div>
                );

            case "inquiries":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.menu.inquiries}</h2>
                        <div className={styles.list}>
                            {listLoading ? <p>{t.common.loading}</p> : inquiries.length > 0 ? inquiries.map(iq => (
                                <div key={iq.id} className={styles.listItem}>
                                    <div className={styles.listHeader}>
                                        <span className={`${styles.statusBadge} ${styles[iq.status?.toLowerCase()]}`}>{iq.status}</span>
                                        <span className={styles.listDate}>{new Date(iq.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className={styles.listTitle}>{iq.title}</h3>
                                    <p className={styles.listContent}>{iq.content}</p>
                                </div>
                            )) : <p className={styles.empty}>{t.inquiries?.empty || "No inquiries."}</p>}
                        </div>
                    </div>
                );

            case "reports":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.reports?.title || "Reports"}</h2>
                        <div className={styles.list}>
                            {listLoading ? <p>{t.common.loading}</p> : reports.length > 0 ? reports.map(rp => (
                                <div key={rp.id} className={styles.listItem}>
                                    <div className={styles.listHeader}>
                                        <span className={`${styles.statusBadge} ${styles[rp.status?.toLowerCase()]}`}>{rp.status}</span>
                                        <span className={styles.listDate}>{new Date(rp.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className={styles.listTitle}>{rp.reason}</h3>
                                    <p className={styles.listContent}>{rp.details}</p>
                                </div>
                            )) : <p className={styles.empty}>{t.reports?.empty || "No reports."}</p>}
                        </div>
                    </div>
                );

            case "settings":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.settings?.title || "Settings"}</h2>
                        <div className={styles.settingsGroup}>
                            <div className={styles.settingItem}>
                                <span>{t.settings?.language || "Language"}</span>
                                <div className={styles.langSwitch}>
                                    <button className={language === 'ko' ? styles.activeLang : ''} onClick={() => setLanguage('ko')}>KO</button>
                                    <button className={language === 'en' ? styles.activeLang : ''} onClick={() => setLanguage('en')}>EN</button>
                                    <button className={language === 'ja' ? styles.activeLang : ''} onClick={() => setLanguage('ja')}>JA</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "delete":
                return (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t.delete?.title || "Withdraw"}</h2>
                        <div className={styles.deleteCard}>
                            <p>{t.delete?.desc || "Are you sure you want to delete your account?"}</p>
                            <button className={styles.deleteBtn}>{t.delete?.btn || "Delete Account"}</button>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className={styles.page}>
            <Background3D entryDirection="float" />

            <div className={styles.container}>
                <div className={styles.layout}>
                    <button className={styles.exitBtn} onClick={() => router.push("/")}>✕</button>

                    <div className={styles.sidebar}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={`${styles.menuItem} ${activeMenu === item.id ? styles.active : ""}`}
                                onClick={() => setActiveMenu(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.content}>
                        {renderContent()}
                    </div>
                </div>
            </div>

            {selectedJob && (
                <div className={styles.modalOverlay} onClick={() => setSelectedJob(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={() => setSelectedJob(null)}>✕</button>
                        <div className={styles.viewerContainer}>
                            <KidsLdrPreview url={selectedJob.modelKey!} stepMode={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
