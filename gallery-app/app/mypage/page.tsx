"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./MyPage.module.css";
import { getMyOverview, getMyProfile, retryJob, updateMyProfile, ApiError } from "@/lib/api/myApi";
import type { MyOverview, MyProfile, MyJob } from "@/lib/api/myApi";
import KidsLdrPreview from "@/components/kids/KidsLdrPreview";
import UpgradeModal from "@/components/UpgradeModal";

// SVG Icons
const Icons = {
    User: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    CreditCard: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>,
    Briefcase: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    Mail: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
    AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>,
    Settings: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
    LogOut: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>,
    Edit: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>,
    Hammer: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H14.14c-.85 0-1.65-.33-2.25-.93L10.64 4.64" /><path d="M14 12V7" /></svg>,
    Image: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>,
    Calendar: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>,
    X: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>,
    CornerDownRight: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 16 9 21 4 16" /><path d="M20 4v7a4 4 0 0 1-4 4H9" /></svg>,
    Camera: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
};

// types
type MenuItem = "profile" | "membership" | "jobs" | "inquiries" | "reports" | "settings" | "delete";

export default function MyPage() {
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, isLoading, authFetch } = useAuth(); // Removed 'user' as it's not used directly (we use profile state)

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

    // 3D 뷰어 모달 상태
    const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
    // 작업 메뉴 모달 상태
    const [menuJob, setMenuJob] = useState<MyJob | null>(null);

    // 확장 상태 (문의/신고)
    const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    // 업그레이드 모달 상태
    const [showUpgrade, setShowUpgrade] = useState(false);

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
    }, [language, isAuthenticated, isLoading, router]);

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
            case "CANCELED": return "paused";
            case "DONE": return "completed";
            case "FAILED": return "failed";
            default: return "";
        }
    };

    // (Helper functions for labels omitted for brevity - same as before)
    const getReportStatusLabel = (status: string) => t.reports?.status?.[status] || status;
    const getReportReasonLabel = (reason: string) => t.reports?.reasons?.[reason] || reason;
    const getReportTargetLabel = (type: string) => t.reports?.targets?.[type] || type;
    const getInquiryStatusLabel = (status: string) => t.inquiries?.status?.[status] || status;
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
    };

    // 파일 다운로드 헬퍼
    const downloadFile = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Download failed:', error);
            alert(t.common.error);
        }
    };

    // 작업 메뉴 핸들러
    const handleJobClick = (job: MyJob) => {
        if (job.status === "FAILED") {
            alert(t.jobs.modalError + job.errorMessage);
        } else if (job.status === "DONE") {
            setMenuJob(job);
        } else {
            alert(t.jobs.modalPending);
        }
    };

    const handleMenuAction = (action: string) => {
        if (!menuJob) return;

        switch (action) {
            case 'source':
                if (menuJob.sourceImageUrl) {
                    downloadFile(menuJob.sourceImageUrl, `${menuJob.title || 'source'}_original.png`);
                }
                break;
            case 'corrected':
                if (menuJob.correctedImageUrl) {
                    downloadFile(menuJob.correctedImageUrl, `${menuJob.title || 'corrected'}_enhanced.png`);
                } else {
                    alert(t.jobs.noEnhancedImage || '개선 이미지가 없습니다.');
                }
                break;
            case 'glb':
                if (menuJob.glbUrl) {
                    downloadFile(menuJob.glbUrl, `${menuJob.title || 'model'}.glb`);
                } else {
                    alert(t.jobs.noGlbFile || 'GLB 파일이 없습니다.');
                }
                break;
            case 'ldr':
                if (menuJob.ldrUrl) {
                    downloadFile(menuJob.ldrUrl, `${menuJob.title || 'model'}.ldr`);
                } else {
                    alert(t.jobs.noLdrFile || 'LDR 파일이 없습니다.');
                }
                break;
            case 'view':
                if (menuJob.ldrUrl) {
                    setSelectedJob(menuJob);
                    setMenuJob(null);
                } else {
                    alert(t.jobs.modalNoData);
                }
                break;
        }
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
            fetchJobs(); // Fetch immediately on switch
        }

        if (activeMenu === "inquiries") fetchMyInquiries();
        if (activeMenu === "reports") fetchMyReports();

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
        if (loading) return <div className={styles.mypage__loading}>{t.common.loading}...</div>;

        if (error) {
            return (
                <div className={styles.mypage__error}>
                    <Icons.AlertTriangle />
                    <p>{error.message}</p>
                    <button className={styles.mypage__btn3d} onClick={() => window.location.reload()}>
                        {t.common.retryBtn}
                    </button>
                </div>
            );
        }

        switch (activeMenu) {
            case "profile":
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
                                        <div className={styles.mypage__avatarUpload}>
                                            <Icons.Camera />
                                        </div>
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
                                                    className={styles.mypage__formInput}
                                                    style={{ width: 'auto', display: 'inline-block', fontSize: '24px', fontWeight: 'bold', padding: '4px 8px' }}
                                                    value={editNickname}
                                                    onChange={(e) => setEditNickname(e.target.value)}
                                                    placeholder="Nickname"
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
                                                placeholder="Bio"
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
                                        <span className={styles.stat__value} style={{ fontSize: '24px' }}>
                                            {profile.createdAt ? formatDate(profile.createdAt) : "-"}
                                        </span>
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
                            <div className={styles.mypage__card}>
                                <span className={styles.mypage__roleBadge} style={{ fontSize: '18px', marginBottom: '20px', display: 'inline-block' }}>
                                    {profile.membershipPlan}
                                </span>
                                <p className={styles.mypage__planDesc}>
                                    {t.membership.desc?.replace("{plan}", profile.membershipPlan)}
                                </p>
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
                                        onClick={() => handleJobClick(job)}
                                    >
                                        <div className={styles.mypage__jobThumbData}>
                                            <img src={job.sourceImageUrl || "/placeholder.png"} alt={job.title} className={styles.mypage__jobThumb} />
                                            <div className={styles.mypage__jobOverlay}>
                                                <span className={`${styles.mypage__jobStatus} ${styles[getStatusClass(job.status)]}`}>
                                                    {getStatusLabel(job.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.mypage__jobInfo}>
                                            <div className={styles.mypage__jobTitle} style={{ fontSize: '14px' }}>{job.title || "Untitled"}</div>
                                            <div className={styles.mypage__jobDate}>{formatDate(job.createdAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className={styles.mypage__empty}>{t.jobs.empty}</p>}
                    </div>
                );

            // ... (Other cases implementation using similar generic styles)

            case "inquiries":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.inquiries.title}</h2>
                        <div className={styles.mypage__inquiriesList}>
                            {listLoading ? (
                                <p className={styles.mypage__loadingText}>{t.common.loading}...</p>
                            ) : inquiries.length > 0 ? (
                                inquiries.map((inquiry: any) => (
                                    <div
                                        key={inquiry.id}
                                        className={styles.mypage__inquiryCard}
                                        onClick={() => setExpandedInquiryId(expandedInquiryId === inquiry.id ? null : inquiry.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className={styles.inquiry__header}>
                                            <span className={`${styles.inquiry__statusBadge} ${inquiry.status === 'ANSWERED' ? styles.answered : ''}`}>
                                                {getInquiryStatusLabel(inquiry.status)}
                                            </span>
                                            <span className={styles.inquiry__date}>{formatDate(inquiry.createdAt)}</span>
                                        </div>
                                        <h3 className={styles.inquiry__title}>{inquiry.title}</h3>

                                        {expandedInquiryId === inquiry.id && (
                                            <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                                                <p className={styles.inquiry__content}>{inquiry.content}</p>
                                                {inquiry.answer && (
                                                    <div className={styles.inquiry__answer}>
                                                        <strong>{t.inquiries.adminAnswer}:</strong> {typeof inquiry.answer === 'string' ? inquiry.answer : inquiry.answer?.content}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.mypage__empty}>{t.inquiries.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "reports":
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>{t.reports.title}</h2>
                        <div className={styles.mypage__inquiriesList}>
                            {listLoading ? (
                                <p className={styles.mypage__loadingText}>{t.common.loading}...</p>
                            ) : reports.length > 0 ? (
                                reports.map((report: any) => (
                                    <div
                                        key={report.id}
                                        className={styles.mypage__inquiryCard}
                                        onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                        {/* Header: Status and Date */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span className={`${styles.report__statusBadge} ${report.status === 'RESOLVED' ? styles.resolved : styles.pending}`}>
                                                {getReportStatusLabel(report.status)}
                                            </span>
                                            <span className={styles.inquiry__date}>{formatDate(report.createdAt)}</span>
                                        </div>

                                        {/* Main Content: Type, Reason, Description */}
                                        <span className={styles.report__type}>{getReportTargetLabel(report.targetType)}</span>
                                        <span className={styles.report__reason}>{getReportReasonLabel(report.reason)}</span>

                                        <p className={styles.report__description}>
                                            {report.details || report.description}
                                        </p>
                                        <div className={styles.report__dataId}>
                                            {t.reports.dataId}: {report.targetId || report.dataId || "N/A"}
                                        </div>

                                        {/* Admin Answer (Resolution Note) - Show when expanded */}
                                        {expandedReportId === report.id && (report.resolutionNote || report.adminComment) && (
                                            <div className={styles.report__adminAnswerBox}>
                                                <div className={styles.report__adminTitleBadge}>
                                                    <Icons.CornerDownRight />
                                                    {t.reports.adminNote}
                                                </div>
                                                <p className={styles.report__resolutionNote}>
                                                    {report.resolutionNote || report.adminComment}
                                                </p>
                                                {report.resolvedAt && (
                                                    <span className={styles.report__resolvedDate}>
                                                        {formatDate(report.resolvedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.mypage__empty}>{t.reports.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "settings":
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

            default:
                return (
                    <div className={styles.mypage__section}>
                        <h2 className={styles.mypage__sectionTitle}>Pages</h2>
                        <div className={styles.mypage__card}>
                            <p>Preparing content for {activeMenu}...</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`${styles.mypage} ${styles['lang-' + language]}`}>
            <div className={styles.mypage__container}>
                <div className={styles.mypage__layout}>
                    <button className={styles.mypage__exitBtn} onClick={() => router.push("/")}>
                        <Icons.X />
                    </button>

                    <div className={styles.mypage__sidebar}>
                        <div className={styles.mypage__menuGroup}>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'profile' ? styles.active : ''}`} onClick={() => setActiveMenu('profile')}>
                                <Icons.User className={styles.mypage__menuIcon} /> {t.menu.profile}
                            </button>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'membership' ? styles.active : ''}`} onClick={() => setActiveMenu('membership')}>
                                <Icons.CreditCard className={styles.mypage__menuIcon} /> {t.menu.membership}
                            </button>
                        </div>

                        <div className={styles.mypage__menuGroup}>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'jobs' ? styles.active : ''}`} onClick={() => setActiveMenu('jobs')}>
                                <Icons.Briefcase className={styles.mypage__menuIcon} /> {t.menu.jobs}
                            </button>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'inquiries' ? styles.active : ''}`} onClick={() => setActiveMenu('inquiries')}>
                                <Icons.Mail className={styles.mypage__menuIcon} /> {t.menu.inquiries}
                            </button>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'reports' ? styles.active : ''}`} onClick={() => setActiveMenu('reports')}>
                                <Icons.AlertTriangle className={styles.mypage__menuIcon} /> {t.menu.reports}
                            </button>
                        </div>

                        <div className={styles.mypage__menuGroup}>
                            <button className={`${styles.mypage__menuItem} ${activeMenu === 'settings' ? styles.active : ''}`} onClick={() => setActiveMenu('settings')}>
                                <Icons.Settings className={styles.mypage__menuIcon} /> {t.menu.settings}
                            </button>
                        </div>

                        <button className={styles.mypage__deleteLink} onClick={() => {/* Handle delete */ }}>
                            {t.menu.delete} <Icons.LogOut width={16} height={16} />
                        </button>
                    </div>

                    <div className={styles.mypage__content}>
                        {renderContent()}
                    </div>

                    {/* Decorations */}
                    <div className={styles.mypage__decorations}>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#FFD600', height: '40px' }}></div>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#3b82f6', height: '30px' }}></div>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#ef4444', height: '50px' }}></div>
                    </div>
                </div>
            </div>

            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

            {/* 작업 메뉴 모달 */}
            {menuJob && (
                <div className={styles.mypage__modalOverlay} onClick={() => setMenuJob(null)}>
                    <div className={styles.mypage__menuModal} onClick={e => e.stopPropagation()}>
                        <button
                            className={styles.mypage__closeBtn}
                            onClick={() => setMenuJob(null)}
                        >
                            ✕
                        </button>
                        <div className={styles.mypage__menuHeader}>
                            <img
                                src={menuJob.sourceImageUrl || "/placeholder.png"}
                                alt={menuJob.title}
                                className={styles.mypage__menuThumb}
                            />
                            <div className={styles.mypage__menuInfo}>
                                <h3 className={styles.mypage__menuTitle}>{menuJob.title || t.mypage.noTitle}</h3>
                                <span className={styles.mypage__menuDate}>{formatDate(menuJob.createdAt)}</span>
                            </div>
                        </div>
                        <div className={styles.mypage__menuList}>
                            <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('source')}
                                disabled={!menuJob.sourceImageUrl}
                            >
                                <span className={styles.mypage__menuIcon2}>🖼️</span>
                                <span>{t.jobs.menu?.sourceImage || '원본 이미지 다운'}</span>
                            </button>
                            <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('corrected')}
                                disabled={!menuJob.correctedImageUrl}
                            >
                                <span className={styles.mypage__menuIcon2}>✨</span>
                                <span>{t.jobs.menu?.enhancedImage || '개선 이미지 다운'}</span>
                            </button>
                            <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('glb')}
                                disabled={!menuJob.glbUrl}
                            >
                                <span className={styles.mypage__menuIcon2}>📦</span>
                                <span>{t.jobs.menu?.glbFile || '모델링 파일 다운'}</span>
                            </button>
                            <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('ldr')}
                                disabled={!menuJob.ldrUrl}
                            >
                                <span className={styles.mypage__menuIcon2}>📄</span>
                                <span>{t.jobs.menu?.ldrFile || 'LDR 다운'}</span>
                            </button>
                            <button
                                className={`${styles.mypage__menuItem2} ${styles.primary}`}
                                onClick={() => handleMenuAction('view')}
                                disabled={!menuJob.ldrUrl}
                            >
                                <span className={styles.mypage__menuIcon2}>👁️</span>
                                <span>{t.jobs.menu?.viewBlueprint || '도면보기'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D 뷰어 모달 */}
            {selectedJob && (
                <div className={styles.mypage__modalOverlay}>
                    <div className={styles.mypage__modalContent}>
                        <button className={styles.mypage__closeBtn} onClick={() => setSelectedJob(null)}>
                            <Icons.X />
                        </button>
                        <div className={styles.mypage__viewerContainer}>
                            {selectedJob.ldrUrl ? (
                                <KidsLdrPreview url={selectedJob.ldrUrl} stepMode={true} />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
