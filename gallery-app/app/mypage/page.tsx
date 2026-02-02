"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
// import styles from "./MyPage.module.css"; // Removed
import { getMyOverview, getMyProfile, retryJob, updateMyProfile, ApiError } from "@/lib/api/myApi";
import type { MyOverview, MyProfile, MyJob } from "@/lib/api/myApi";
import KidsLdrPreview from "@/components/kids/KidsLdrPreview";
import BackgroundBricks from "@/components/BackgroundBricks";
import UpgradeModal from "@/components/UpgradeModal";
import { getColorThemes, applyColorVariant, downloadLdrFromBase64, type ThemeInfo } from "@/lib/api/colorVariantApi";

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
    Camera: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
    Search: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
    Layers: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.18 6.27a2 2 0 0 0 0 3.66l9 4.1a2 2 0 0 0 1.66 0l8.99-4.1a2 2 0 0 0 0-3.66Z" /><path d="m2.18 16.27 8.99 4.1a2 2 0 0 0 1.66 0l8.99-4.1" /><path d="m2.18 11.27 8.99 4.1a2 2 0 0 0 1.66 0l8.99-4.1" /></svg>,
    DownloadImage: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>,
    DownloadFile: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><polyline points="14 2 14 8 20 8" /><line x1="12" x2="12" y1="18" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>
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
    // 이미지 원본 보기 모달 상태
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // 확장 상태 (문의/신고)
    const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    // 업그레이드 모달 상태
    const [showUpgrade, setShowUpgrade] = useState(false);

    // 색상 변경 관련 상태
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

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

    // 파일 다운로드 헬퍼 (CORS 우회를 위해 a 태그 직접 사용)
    const downloadFile = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            case 'preview':
                if (menuJob.sourceImageUrl) {
                    setPreviewImage(menuJob.sourceImageUrl);
                    setMenuJob(null);
                }
                break;
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

    // 색상 변경 관련 함수
    const openColorModal = async () => {
        setMenuJob(null);
        setIsColorModalOpen(true);
        if (colorThemes.length === 0) {
            try {
                const themes = await getColorThemes();
                setColorThemes(themes);
            } catch (e) {
                console.error("테마 로드 실패:", e);
            }
        }
    };

    const handleApplyColor = async () => {
        if (!selectedTheme || !menuJob?.ldrUrl) return;

        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(menuJob.ldrUrl, selectedTheme, authFetch);

            if (result.ok && result.ldrData) {
                setColorChangedLdrBase64(result.ldrData);
                setIsColorModalOpen(false);
                alert(`${result.themeApplied} 테마 적용 완료! (${result.changedBricks}개 브릭 변경)\n다운로드 버튼을 눌러 저장하세요.`);
            } else {
                alert(result.message || "색상 변경 실패");
            }
        } catch (e: any) {
            console.error("색상 변경 실패:", e);
            alert(e.message || "색상 변경 중 오류가 발생했습니다.");
        } finally {
            setIsApplyingColor(false);
        }
    };

    const downloadColorChangedLdr = () => {
        if (colorChangedLdrBase64) {
            downloadLdrFromBase64(colorChangedLdrBase64, `brickers_${selectedTheme}.ldr`);
        }
    };

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
        if (loading) return <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">{t.common.loading}...</div>;

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                    <Icons.AlertTriangle />
                    <p>{error.message}</p>
                    <button className="px-6 py-3 border-2 border-black rounded-xl font-extrabold cursor-pointer bg-white text-black shadow-[4px_4px_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none" onClick={() => window.location.reload()}>
                        {t.common.retryBtn}
                    </button>
                </div>
            );
        }

        switch (activeMenu) {
            case "profile":
                return (
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.profile.title}</h2>

                        {profile && (
                            <div className="flex flex-col gap-10 animate-[slideUp_0.4s_ease]">
                                <div className="flex items-center gap-10 p-10 bg-[#f8f9fa] rounded-[32px] border border-[#eee] md:flex-col md:items-start md:gap-5 md:p-6">
                                    <div className="relative w-[140px] h-[140px] shrink-0">
                                        <img
                                            src={profile.profileImage || "/default-avatar.png"}
                                            alt="Profile"
                                            className="w-full h-full rounded-3xl object-cover border-[3px] border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.1)]"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-4 w-full">
                                        <div className="flex items-center gap-3">
                                            {!isEditing ? (
                                                <>
                                                    <h3 className="text-[32px] font-black text-[#111] m-0">{profile.nickname}</h3>
                                                    <span className="px-[14px] py-1.5 bg-[#FFD600] text-black rounded-full text-[13px] font-extrabold">{profile.membershipPlan}</span>
                                                </>
                                            ) : (
                                                <input
                                                    className="w-auto inline-block text-2xl font-bold px-2 py-1 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-black focus:shadow-[0_0_0_2px_rgba(0,0,0,0.1)]"
                                                    value={editNickname}
                                                    onChange={(e) => setEditNickname(e.target.value)}
                                                    placeholder={t.profile.nickname}
                                                />
                                            )}
                                        </div>
                                        <p className="text-base text-gray-500 m-0">{profile.email}</p>

                                        {!isEditing ? (
                                            <div className="p-[16px_20px] bg-white border-2 border-dashed border-gray-200 rounded-xl text-gray-600 text-[15px] leading-relaxed min-h-[60px]">
                                                {profile.bio || t.mypage.bioPlaceholder}
                                            </div>
                                        ) : (
                                            <textarea
                                                className="w-full p-3 border-2 border-gray-200 rounded-xl text-base font-inherit bg-white resize-none mb-2 transition-all duration-200 focus:outline-none focus:border-black focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,0,0,0.1)]"
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                placeholder={t.mypage.bioPlaceholder}
                                            />
                                        )}

                                        {!isEditing ? (
                                            <button className="self-start flex items-center gap-2 px-6 py-3 bg-green-500 text-white border-none rounded-full text-[15px] font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_0_#15803d] mt-2 hover:translate-y-[2px] hover:shadow-[0_2px_0_#15803d] active:translate-y-1 active:shadow-none" onClick={startEditing}>
                                                <Icons.Edit /> {t.profile.editBtn}
                                            </button>
                                        ) : (
                                            <div className="flex gap-3 mt-3">
                                                <button className="px-5 py-2.5 border-2 border-gray-200 bg-white rounded-full font-bold cursor-pointer text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:text-[#111]" onClick={cancelEditing}>{t.common.cancel}</button>
                                                <button className="px-5 py-2.5 bg-black text-white border-2 border-black rounded-full font-bold cursor-pointer shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)]" onClick={saveProfile} disabled={saving}>{t.common.confirm}</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6 md:grid-cols-1">
                                    <div className="bg-white border-2 border-[#eee] rounded-3xl p-6 flex flex-col relative shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-[5px] hover:border-black hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[15px] font-bold text-gray-500">{t.mypage.stats.jobs}</span>
                                        </div>
                                        <span className="text-[42px] font-black text-[#111]">{data?.jobs.totalCount || 0}</span>
                                    </div>
                                    <div className="bg-white border-2 border-[#eee] rounded-3xl p-6 flex flex-col relative shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-[5px] hover:border-black hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[15px] font-bold text-gray-500">{t.mypage.stats.gallery}</span>
                                        </div>
                                        <span className="text-[42px] font-black text-[#111]">{data?.gallery.totalCount || 0}</span>
                                    </div>
                                    <div className="bg-white border-2 border-[#eee] rounded-3xl p-6 flex flex-col relative shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-[5px] hover:border-black hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[15px] font-bold text-gray-500">{t.mypage.stats.joinedAt}</span>
                                        </div>
                                        <span className="text-[42px] font-black text-[#111] text-2xl!">
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
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.membership.title}</h2>
                        {profile && (
                            <div className="bg-white border-2 border-gray-200 rounded-[20px] p-6">
                                <span className="px-[14px] py-1.5 bg-[#FFD600] text-black rounded-full text-[13px] font-extrabold text-lg! mb-5 inline-block">
                                    {profile.membershipPlan}
                                </span>
                                <p>
                                    {t.membership.desc?.replace("{plan}", profile.membershipPlan)}
                                </p>
                            </div>
                        )}
                    </div>
                );

            case "jobs":
                return (
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.jobs.title}</h2>
                        {data?.jobs.recent && data.jobs.recent.length > 0 ? (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                                {data.jobs.recent.map((job) => (
                                    <div
                                        key={job.id}
                                        className="bg-white border-2 border-gray-200 rounded-[20px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-black hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] group"
                                        onClick={() => handleJobClick(job)}
                                    >
                                        <div className="relative w-full pt-[100%] bg-[#f9f9f9] border-b border-[#eee] overflow-hidden">
                                            <img src={job.sourceImageUrl || "/placeholder.png"} alt={job.title} className="absolute top-0 left-0 w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-105" />
                                            <div className="absolute top-3 left-3 z-[2]">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase shadow-[0_2px_5px_rgba(0,0,0,0.1)] border-[1.5px] border-black ${getStatusClass(job.status) === 'pending' ? 'bg-white text-black' : getStatusClass(job.status) === 'running' ? 'bg-blue-500 text-white' : getStatusClass(job.status) === 'completed' ? 'bg-green-500 text-white' : getStatusClass(job.status) === 'failed' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                                    {getStatusLabel(job.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col gap-1.5">
                                            <div className="text-[15px] font-extrabold text-[#111] whitespace-nowrap overflow-hidden text-ellipsis">{job.title || "Untitled"}</div>
                                            <div className="text-xs text-[#999] font-medium">{formatDate(job.createdAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-500 text-center py-10">{t.jobs.empty}</p>}
                    </div>
                );

            case "inquiries":
                return (
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.inquiries.title}</h2>
                        <div>
                            {listLoading ? (
                                <p className="text-gray-500 text-center py-10">{t.common.loading}...</p>
                            ) : inquiries.length > 0 ? (
                                inquiries.map((inquiry: any) => (
                                    <div
                                        key={inquiry.id}
                                        className="bg-white border-2 border-gray-200 rounded-[20px] p-6 mb-5 transition-colors duration-200 hover:border-[#aaa]"
                                        onClick={() => setExpandedInquiryId(expandedInquiryId === inquiry.id ? null : inquiry.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`inline-block px-3 py-1.5 border border-[#111] rounded text-sm font-bold mb-3 ${inquiry.status === 'ANSWERED' ? 'bg-[#111] text-white' : 'bg-white text-[#111]'}`}>
                                                {getInquiryStatusLabel(inquiry.status)}
                                            </span>
                                            <span className="text-sm text-[#999]">{formatDate(inquiry.createdAt)}</span>
                                        </div>
                                        <h3 className="text-lg font-extrabold text-[#111] mb-2 block">{inquiry.title}</h3>

                                        {expandedInquiryId === inquiry.id && (
                                            <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                                                <p className="text-base text-[#444] mb-2 leading-relaxed">{inquiry.content}</p>
                                                {inquiry.answer && (
                                                    <div className="mt-4 p-4 bg-[#f9fafb] rounded-lg relative">
                                                        <strong>{t.inquiries.adminAnswer}:</strong> {typeof inquiry.answer === 'string' ? inquiry.answer : inquiry.answer?.content}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-10">{t.inquiries.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "reports":
                return (
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.reports.title}</h2>
                        <div>
                            {listLoading ? (
                                <p className="text-gray-500 text-center py-10">{t.common.loading}...</p>
                            ) : reports.length > 0 ? (
                                reports.map((report: any) => (
                                    <div
                                        key={report.id}
                                        className="bg-white border-2 border-gray-200 rounded-[20px] p-6 mb-5 transition-colors duration-200 hover:border-[#aaa]"
                                        onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                        {/* Header: Status and Date */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span className={`inline-block px-3 py-1.5 rounded text-sm font-bold mb-3 ${report.status === 'RESOLVED' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-[#333]'}`}>
                                                {getReportStatusLabel(report.status)}
                                            </span>
                                            <span className="text-sm text-[#999]">{formatDate(report.createdAt)}</span>
                                        </div>

                                        {/* Main Content: Type, Reason, Description */}
                                        <span className="text-base font-semibold text-gray-500 mb-1 block">{getReportTargetLabel(report.targetType)}</span>
                                        <span className="text-2xl font-extrabold text-[#111] mb-2 block leading-tight">{getReportReasonLabel(report.reason)}</span>

                                        <p className="text-base text-[#444] mb-2 leading-relaxed">
                                            {report.details || report.description}
                                        </p>
                                        <div className="text-[13px] text-[#999]">
                                            {t.reports.dataId}: {report.targetId || report.dataId || "N/A"}
                                        </div>

                                        {/* Admin Answer (Resolution Note) - Show when expanded */}
                                        {expandedReportId === report.id && (report.resolutionNote || report.adminComment) && (
                                            <div className="mt-4 p-4 bg-[#f9fafb] rounded-lg relative">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-[#333] mb-2">
                                                    <Icons.CornerDownRight />
                                                    {t.reports.adminNote}
                                                </div>
                                                <p className="text-[15px] text-[#333] leading-relaxed">
                                                    {report.resolutionNote || report.adminComment}
                                                </p>
                                                {report.resolvedAt && (
                                                    <span className="block text-right text-xs text-[#999] mt-2">
                                                        {formatDate(report.resolvedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-10">{t.reports.empty}</p>
                            )}
                        </div>
                    </div>
                );

            case "settings":
                return (
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">{t.settings.title}</h2>
                        <div className="bg-white border-2 border-gray-200 rounded-[20px] p-6">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Language Settings */}
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{t.settings.language}</h3>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            className={`px-6 py-3 border-2 border-black rounded-xl font-extrabold cursor-pointer bg-white text-black shadow-[4px_4px_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none ${language === 'ko' ? "bg-[#FFD600]" : ""}`}
                                            onClick={() => setLanguage('ko')}
                                            style={{ backgroundColor: language === 'ko' ? '#FFD600' : '#fff' }}
                                        >
                                            {t.settings.langKo}
                                        </button>
                                        <button
                                            className={`px-6 py-3 border-2 border-black rounded-xl font-extrabold cursor-pointer bg-white text-black shadow-[4px_4px_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none ${language === 'en' ? "bg-[#FFD600]" : ""}`}
                                            onClick={() => setLanguage('en')}
                                            style={{ backgroundColor: language === 'en' ? '#FFD600' : '#fff' }}
                                        >
                                            {t.settings.langEn}
                                        </button>
                                        <button
                                            className={`px-6 py-3 border-2 border-black rounded-xl font-extrabold cursor-pointer bg-white text-black shadow-[4px_4px_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none ${language === 'ja' ? "bg-[#FFD600]" : ""}`}
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
                    <div>
                        <h2 className="text-[32px] font-black text-[#111] mb-8 flex items-center gap-3 before:content-[''] before:block before:w-2 before:h-8 before:bg-blue-500 before:rounded">Pages</h2>
                        <div className="bg-white border-2 border-gray-200 rounded-[20px] p-6">
                            <p>{t.mypage.preparing}</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={`min-h-screen w-full relative bg-transparent font-sans ${language === 'ko' ? "font-['Cafe24Surround']" : language === 'ja' ? "font-['Jua']" : ""}`}>
            <BackgroundBricks />
            <div className="max-w-[1200px] mx-auto my-10 pt-[60px] relative z-10 flex flex-col h-[85vh] md:h-auto md:min-h-[90vh] md:m-5">
                <div className="flex gap-0 bg-white border-[3px] border-black rounded-[32px] overflow-hidden h-full shadow-[0_20px_60px_rgba(0,0,0,0.1)] relative md:flex-col md:rounded-[20px]">
                    <button className="absolute top-6 right-6 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black z-50 hover:text-black hover:rotate-90 hover:scale-110" onClick={() => router.back()}>
                        <Icons.X />
                    </button>

                    <div className="w-[260px] bg-[#fdfdfd] border-r-2 border-[#eee] p-[32px_20px] flex flex-col gap-10 shrink-0 md:w-full md:border-r-0 md:border-b-2 md:p-5 md:gap-5">
                        <div className="flex flex-col gap-2 relative md:flex-row md:gap-3 md:flex-wrap after:md:hidden after:content-[''] after:block after:h-px after:border-b-2 after:border-dashed after:border-gray-200 after:mt-6 after:mb-2 last:after:hidden">
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'profile' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('profile')}>
                                <Icons.User className="w-5 h-5 shrink-0" /> {t.menu.profile}
                            </button>
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'membership' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('membership')}>
                                <Icons.CreditCard className="w-5 h-5 shrink-0" /> {t.menu.membership}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 relative md:flex-row md:gap-3 md:flex-wrap after:md:hidden after:content-[''] after:block after:h-px after:border-b-2 after:border-dashed after:border-gray-200 after:mt-6 after:mb-2 last:after:hidden">
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'jobs' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('jobs')}>
                                <Icons.Briefcase className="w-5 h-5 shrink-0" /> {t.menu.jobs}
                            </button>
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'inquiries' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('inquiries')}>
                                <Icons.Mail className="w-5 h-5 shrink-0" /> {t.menu.inquiries}
                            </button>
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'reports' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('reports')}>
                                <Icons.AlertTriangle className="w-5 h-5 shrink-0" /> {t.menu.reports}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 relative md:flex-row md:gap-3 md:flex-wrap after:md:hidden after:content-[''] after:block after:h-px after:border-b-2 after:border-dashed after:border-gray-200 after:mt-6 after:mb-2 last:after:hidden">
                            <button className={`flex items-center gap-3 p-[14px_16px] border-none bg-transparent cursor-pointer text-[15px] font-bold text-gray-600 text-left rounded-xl transition-all duration-200 relative hover:bg-gray-100 hover:text-[#111] ${activeMenu === 'settings' ? "bg-[#FFD600] text-black font-extrabold shadow-[0_4px_12px_rgba(255,214,0,0.3)] after:content-[''] after:absolute after:right-4 after:w-1.5 after:h-1.5 after:bg-black after:rounded-full" : ''}`} onClick={() => setActiveMenu('settings')}>
                                <Icons.Settings className="w-5 h-5 shrink-0" /> {t.menu.settings}
                            </button>
                        </div>

                        <button className="mt-auto flex items-center gap-2 p-[12px_16px] text-red-500 text-sm font-semibold cursor-pointer bg-transparent border-none transition-all duration-200 hover:underline hover:opacity-80 md:ml-auto" onClick={() => {/* Handle delete */ }}>
                            {t.menu.delete} <Icons.LogOut width={16} height={16} />
                        </button>
                    </div>

                    <div className="flex-1 p-[40px_60px] overflow-y-auto bg-white relative md:p-5">
                        {renderContent()}
                    </div>

                    {/* Decorations */}
                    <div className="absolute -bottom-5 right-10 flex gap-1 z-20">
                        <div className="w-[60px] h-[30px] rounded-[4px_4px_0_0] border-[3px] border-black border-b-0 relative bg-white after:content-[''] after:absolute after:-top-2 after:left-2 after:w-3 after:h-1.5 after:bg-inherit after:border-[3px] after:border-black after:border-b-0 after:rounded-[2px_2px_0_0] after:shadow-[26px_0_0_-3px_inherit,26px_0_0_0_#000]" style={{ backgroundColor: '#FFD600', height: '40px' }}></div>
                        <div className="w-[60px] h-[30px] rounded-[4px_4px_0_0] border-[3px] border-black border-b-0 relative bg-white after:content-[''] after:absolute after:-top-2 after:left-2 after:w-3 after:h-1.5 after:bg-inherit after:border-[3px] after:border-black after:border-b-0 after:rounded-[2px_2px_0_0] after:shadow-[26px_0_0_-3px_inherit,26px_0_0_0_#000]" style={{ backgroundColor: '#3b82f6', height: '30px' }}></div>
                        <div className="w-[60px] h-[30px] rounded-[4px_4px_0_0] border-[3px] border-black border-b-0 relative bg-white after:content-[''] after:absolute after:-top-2 after:left-2 after:w-3 after:h-1.5 after:bg-inherit after:border-[3px] after:border-black after:border-b-0 after:rounded-[2px_2px_0_0] after:shadow-[26px_0_0_-3px_inherit,26px_0_0_0_#000]" style={{ backgroundColor: '#ef4444', height: '50px' }}></div>
                    </div>
                </div>
            </div>

            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

            {/* 작업 메뉴 모달 */}
            {menuJob && (
                <div className="fixed top-0 left-0 w-screen h-screen bg-black/60 z-[1500] flex justify-center items-center animate-[fadeIn_0.2s_ease]" onClick={() => setMenuJob(null)}>
                    <div className="relative w-[90%] max-w-[400px] bg-white rounded-[32px] border-[3px] border-black shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden animate-[slideUp_0.3s_ease]" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black z-100 hover:rotate-90 hover:scale-110 text-black"
                            onClick={() => setMenuJob(null)}
                        >
                            ✕
                        </button>
                        <div className="flex items-center gap-4 p-6 border-b-2 border-[#f0f0f0]" style={{ paddingRight: '60px' }}>
                            <img
                                src={menuJob.sourceImageUrl || "/placeholder.png"}
                                alt={menuJob.title}
                                className="w-20 h-20 rounded-xl object-cover border-2 border-black"
                            />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold m-[0_0_4px_0] text-black">{menuJob.title || t.mypage.noTitle}</h3>
                                <span className="text-[13px] text-[#888]">{formatDate(menuJob.createdAt)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col p-4 gap-2">
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#FFD600] border-2 border-black rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left shadow-[0_4px_0_#000] hover:bg-[#FFD600] hover:translate-y-[2px] hover:shadow-[0_2px_0_#000] disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => handleMenuAction('preview')}
                                disabled={!menuJob.sourceImageUrl}
                            >
                                <Icons.Search className="w-5 h-5 flex items-center justify-center" />
                                <span>{t.jobs.menu?.previewImage}</span>
                            </button>
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#FFD600] border-2 border-black rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left shadow-[0_4px_0_#000] hover:bg-[#FFD600] hover:translate-y-[2px] hover:shadow-[0_2px_0_#000] disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => handleMenuAction('view')}
                                disabled={!menuJob.ldrUrl}
                            >
                                <Icons.Layers className="w-5 h-5 flex items-center justify-center" />
                                <span>{t.jobs.menu?.viewBlueprint}</span>
                            </button>
                            <div className="h-px bg-[#eee] my-2" />
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#f8f9fa] border border-[#eee] rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left hover:bg-black hover:text-white hover:translate-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => handleMenuAction('glb')}
                                disabled={!menuJob.glbUrl}
                            >
                                <Icons.DownloadImage className="w-5 h-5 flex items-center justify-center" />
                                <span>{t.jobs.menu?.glbFile}</span>
                            </button>
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#f8f9fa] border border-[#eee] rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left hover:bg-black hover:text-white hover:translate-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => handleMenuAction('ldr')}
                                disabled={!menuJob.ldrUrl}
                            >
                                <Icons.DownloadFile className="w-5 h-5 flex items-center justify-center" />
                                <span>{t.jobs.menu?.ldrFile}</span>
                            </button>
                            <div className="h-px bg-[#eee] my-2" />
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#f8f9fa] border border-[#eee] rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left hover:bg-black hover:text-white hover:translate-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={openColorModal}
                                disabled={!menuJob.ldrUrl}
                            >
                                <Icons.Edit className="w-5 h-5 flex items-center justify-center" />
                                <span>색상 변경</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 이미지 원본 보기 모달 */}
            {previewImage && (
                <div className="fixed top-0 left-0 w-screen h-screen bg-black/90 z-[2000] flex justify-center items-center cursor-zoom-out animate-[fadeIn_0.2s_ease]" onClick={() => setPreviewImage(null)}>
                    <button
                        className="absolute top-5 right-5 w-12 h-12 rounded-full bg-transparent text-white border-none text-2xl font-bold cursor-pointer z-100 flex justify-center items-center transition-all duration-200 hover:rotate-90 hover:scale-110"
                        onClick={() => setPreviewImage(null)}
                    >
                        ✕
                    </button>
                    <img
                        src={previewImage}
                        alt="Original"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.5)] cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* 3D 뷰어 모달 */}
            {selectedJob && (
                <div className="fixed top-0 left-0 w-screen h-screen bg-black/60 z-[1500] flex justify-center items-center animate-[fadeIn_0.2s_ease]">
                    <div className="relative w-[90vw] max-w-[900px] h-[80vh] bg-white rounded-3xl border-[3px] border-black shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden animate-[slideUp_0.3s_ease]">
                        <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 z-50 hover:rotate-90 hover:scale-110 text-black" onClick={() => setSelectedJob(null)}>
                            ✕
                        </button>
                        <div className="w-full h-full bg-[#f8f9fa]">
                            {selectedJob.ldrUrl ? (
                                <KidsLdrPreview url={selectedJob.ldrUrl} stepMode={true} />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* 색상 변경 모달 */}
            {isColorModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] grid place-items-center z-[2000]" onClick={() => setIsColorModalOpen(false)}>
                    <div className="bg-white border-[3px] border-black rounded-[20px] p-8 w-[min(400px,90vw)] flex flex-col gap-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-100 text-black z-[100] hover:rotate-90 hover:scale-110" onClick={() => setIsColorModalOpen(false)}>✕</button>
                        <h3 className="text-[24px] font-black m-0 text-center">색상 테마 선택</h3>

                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                            {colorThemes.length === 0 ? (
                                <div className="p-5 text-center text-[#888]">테마 로딩 중...</div>
                            ) : (
                                colorThemes.map((theme: ThemeInfo) => (
                                    <button
                                        key={theme.name}
                                        className={`flex flex-col items-start p-[14px_16px] rounded-xl border-2 transition-all duration-200 text-left cursor-pointer bg-white ${selectedTheme === theme.name ? "border-black" : "border-[#e0e0e0] hover:border-black"}`}
                                        onClick={() => setSelectedTheme(theme.name)}
                                    >
                                        <span className={`text-[15px] font-[800] ${selectedTheme === theme.name ? "text-[#ffe135]" : "text-black"}`}>{theme.name}</span>
                                        <span className={`text-[12px] mt-0.5 ${selectedTheme === theme.name ? "text-[#333]" : "text-[#888]"}`}>{theme.description}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="flex-1 p-3 rounded-xl border-2 border-black font-[800] cursor-pointer transition-all duration-200 bg-white hover:-translate-y-[0.5]"
                                onClick={() => setIsColorModalOpen(false)}
                            >
                                취소
                            </button>
                            <button
                                className="flex-1 p-3 rounded-xl border-2 border-black font-[800] cursor-pointer transition-all duration-200 bg-black text-white hover:-translate-y-[0.5] disabled:opacity-50"
                                onClick={handleApplyColor}
                                disabled={!selectedTheme || isApplyingColor}
                            >
                                {isApplyingColor ? "..." : "적용하기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 색상 변경된 LDR 다운로드 모달 */}
            {colorChangedLdrBase64 && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] grid place-items-center z-[2000]" onClick={() => setColorChangedLdrBase64(null)}>
                    <div className="bg-white border-[3px] border-black rounded-[20px] p-8 w-[min(400px,90vw)] flex flex-col gap-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-100 text-black z-[100] hover:rotate-90 hover:scale-110" onClick={() => setColorChangedLdrBase64(null)}>✕</button>
                        <h3 className="text-[24px] font-black m-0 text-center">색상 변경 완료</h3>
                        <p className="text-center text-[#666]">{selectedTheme} 테마가 적용되었습니다.</p>
                        <button
                            className="w-full p-4 rounded-xl border-2 border-black font-[800] cursor-pointer transition-all duration-200 bg-[#4CAF50] text-white hover:-translate-y-[2px]"
                            onClick={() => { downloadColorChangedLdr(); setColorChangedLdrBase64(null); }}
                        >
                            변경된 LDR 다운로드
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
