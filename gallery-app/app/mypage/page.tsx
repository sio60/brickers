"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./MyPage.module.css";
import { getMyOverview, getMyProfile, getMyJobs, retryJob, cancelJob, updateMyProfile, cancelMembership, ApiError } from "@/lib/api/myApi";
import type { MyOverview, MyProfile, MyJob } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, downloadLdrFromBase64 } from "@/lib/api/colorVariantApi";

import dynamic from "next/dynamic";
import type { KidsLdrPreviewHandle } from "@/components/kids/KidsLdrPreview";
const KidsLdrPreview = dynamic(() => import("@/components/kids/KidsLdrPreview"), { ssr: false });
import ShareModal from "@/components/kids/ShareModal";
import BackgroundBricks from "@/components/BackgroundBricks";
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
    Camera: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
    Search: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
    Layers: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.18 6.27a2 2 0 0 0 0 3.66l9 4.1a2 2 0 0 0 1.66 0l8.99-4.1a2 2 0 0 0 0-3.66Z" /><path d="m2.18 16.27 8.99 4.1a2 2 0 0 0 1.66 0l8.99-4.1" /><path d="m2.18 11.27 8.99 4.1a2 2 0 0 0 1.66 0l8.99-4.1" /></svg>,
    DownloadImage: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>,
    DownloadFile: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><polyline points="14 2 14 8 20 8" /><line x1="12" x2="12" y1="18" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>,
    Share: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
};

// types
type MenuItem = "profile" | "membership" | "jobs" | "inquiries" | "reports" | "settings" | "delete";

function MyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, isLoading, authFetch, setUser } = useAuth(); // Added setUser

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    const [jobsList, setJobsList] = useState<MyJob[]>([]);
    const [jobsPage, setJobsPage] = useState(0);
    const [jobsTotalPages, setJobsTotalPages] = useState(1);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [jobSort, setJobSort] = useState<'latest' | 'oldest'>('latest');
    const jobsSentinelRef = useRef<HTMLDivElement | null>(null);

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
    const [jobViewStep, setJobViewStep] = useState<"preview" | "start">("preview");
    // 작업 메뉴 모달 상태
    const [menuJob, setMenuJob] = useState<MyJob | null>(null);
    // 이미지 원본 보기 모달 상태
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // 확장 상태 (문의/신고)
    const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    // 업그레이드 모달 상태
    const [showUpgrade, setShowUpgrade] = useState(false);

    // 색상 변경 관련 상태 (현재 마이페이지에서는 비활성화, 나중에 사용 가능)
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<any[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);


    // 공유하기 관련 상태
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
    const [shareJob, setShareJob] = useState<MyJob | null>(null); // 공유할 작업 (렌더링 트리거)
    const sharePreviewRef = useRef<KidsLdrPreviewHandle>(null);

    // 멤버십 해지 모달 상태
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const loadJobsPage = async (page: number, replace = false) => {
        try {
            setJobsLoading(true);
            const res = await getMyJobs(page, 12);
            setJobsTotalPages(res.totalPages || 1);
            setJobsPage(page);
            setJobsList((prev) => replace ? res.content : prev.concat(res.content));
        } catch (err) {
            console.error('[MyPage] Failed to load jobs:', err);
        } finally {
            setJobsLoading(false);
        }
    };

    const resetAndLoadJobs = () => {
        setJobsList([]);
        setJobsPage(0);
        setJobsTotalPages(1);
        loadJobsPage(0, true);
    };

    useEffect(() => {
        const menu = searchParams.get('menu');
        if (menu && ['profile', 'membership', 'jobs', 'inquiries', 'reports', 'settings', 'delete'].includes(menu)) {
            setActiveMenu(menu as MenuItem);
        }
    }, [searchParams]);

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

    useEffect(() => {
        if (activeMenu !== 'jobs') return;
        resetAndLoadJobs();
        // Update URL without reload to reflect current tab (optional but good for UX)
    }, [activeMenu, jobSort]);

    useEffect(() => {
        if (selectedJob) {
            setJobViewStep("preview");
        }
    }, [selectedJob]);

    useEffect(() => {
        if (activeMenu !== 'jobs') return;
        const sentinel = jobsSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (!entry.isIntersecting) return;
            if (jobsLoading) return;
            if (jobsPage + 1 >= jobsTotalPages) return;
            loadJobsPage(jobsPage + 1);
        }, { root: null, rootMargin: '200px', threshold: 0.1 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeMenu, jobsPage, jobsTotalPages, jobsLoading]);

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
            setUser(updated); // Sync with global AuthContext
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

    const handleCancelJob = async (jobId: string) => {
        if (!confirm(t.jobs.cancelConfirm)) return;

        try {
            await cancelJob(jobId);
            const updated = await getMyOverview();
            setData(updated);
        } catch {
            alert(t.jobs.cancelFail);
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

    const handleReportJob = async (job: MyJob) => {
        if (!confirm(t.jobs.reportConfirm)) return;

        try {
            const res = await authFetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targetType: "JOB",
                    targetId: job.id,
                    reason: "OTHER",
                    details: "Reported from MyPage"
                }),
            });

            if (res.ok) {
                alert(t.jobs.reportSuccess);
                setMenuJob(null);
            } else {
                const errData = await res.json();
                alert(`${t.jobs.reportFail}\n${errData.message || ''}`);
            }
        } catch (e) {
            console.error("Report error:", e);
            alert(t.jobs.reportFail);
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
                    alert(t.jobs.noEnhancedImage);
                }
                break;
            case 'glb':
                if (menuJob.glbUrl) {
                    downloadFile(menuJob.glbUrl, `${menuJob.title || 'model'}.glb`);
                } else {
                    alert(t.jobs.noGlbFile);
                }
                break;
            case 'ldr':
                if (menuJob.ldrUrl) {
                    downloadFile(menuJob.ldrUrl, `${menuJob.title || 'model'}.ldr`);
                } else {
                    alert(t.jobs.noLdrFile);
                }
                break;
            case 'view':
                if (menuJob.ldrUrl) {
                    const url = menuJob.ldrUrl;
                    setMenuJob(null);
                    router.push(`/kids/steps?url=${encodeURIComponent(url)}&jobId=${menuJob.id}&autoPdf=true`);
                } else {
                    alert(t.jobs.modalNoData);
                }
                break;
            case 'pdf':
                if (menuJob.instructionsPdfUrl) {
                    downloadFile(menuJob.instructionsPdfUrl, `${menuJob.title || 'guide'}.pdf`);
                } else {
                    alert(t.jobs?.noPdfFile || 'No PDF generated yet.');
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



    // 공유하기 처리 로직
    const handleShare = (job: MyJob) => {
        if (!job.ldrUrl) {
            alert(t.jobs.noLdrFile);
            return;
        }

        // 배경 이미지가 없으면 기본값(null)으로 띄우거나, 혹은 "backgroundUrl"이 있으면 그것을 사용
        // (백엔드에서 backgroundUrl을 내려주도록 수정했으므로, job.backgroundUrl 사용)
        const bgUrl = job.backgroundUrl || null;

        setMenuJob(null);
        setShareJob(job);
        setShareImageUrl(bgUrl);
        setShareModalOpen(true);
        setShareLoading(false); // 이미 URL이 있으므로 로딩 필요 없음
    };

    // 색상 변경 관련 함수
    const openColorModal = async () => {
        if (!menuJob) return;
        setMenuJob(null);
        setIsColorModalOpen(true);
        // 테마 로드 로직 (필요 시 colorVariantApi import 후 사용)
        // try {
        //     if (colorThemes.length === 0) {
        //         const themes = await getColorThemes();
        //         setColorThemes(themes);
        //     }
        // } catch (e) {
        //     console.error("Failed to load color themes", e);
        // }
    };

    const handleApplyColor = async () => {
        // 색상 적용 로직 (필요 시 구현)
        // if (!menuJob?.ldrUrl || !selectedTheme) return;

        // try {
        //     setIsApplyingColor(true);
        //     const res = await applyColorVariant(menuJob.ldrUrl, selectedTheme, authFetch);
        //     if (res.ok && res.ldrData) {
        //         setColorChangedLdrBase64(res.ldrData);
        //         setIsColorModalOpen(false);
        //     } else {
        //         alert(res.message || "색상 변경 실패");
        //     }
        // } catch (e) {
        //     alert(e instanceof Error ? e.message : "색상 변경 중 오류 발생");
        // } finally {
        //     setIsApplyingColor(false);
        // }
        const downloadColorChangedLdr = () => {
            // if (!colorChangedLdrBase64) return;
            // downloadLdrFromBase64(colorChangedLdrBase64, `${menuJob?.title || 'model'}_${selectedTheme}.ldr`);
        };

        // 멤버십 해지 핸들러
        const handleCancelMembership = async () => {
            try {
                setIsCancelling(true);
                const res = await cancelMembership();
                if (res.success) {
                    alert(t.membership.cancelSuccess || "멤버십 해지가 완료되었습니다.");
                    setIsCancelModalOpen(false);
                    // 프로필 정보 즉시 갱신
                    const updatedProfile = await getMyProfile();
                    setProfile(updatedProfile);
                } else {
                    alert(res.message || "멤버십 해지에 실패했습니다.");
                }
            } catch (e: any) {
                alert(e.message || "멤버십 해지 중 오류가 발생했습니다.");
            } finally {
                setIsCancelling(false);
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

                                    {/* 멤버십 해지 버튼 (무료 플랜이 아닐 경우에만 표시 예시 - 여기선 조건 없이 표시하거나 플랜 체크) */}
                                    {profile.membershipPlan !== 'FREE' && (
                                        <div style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                            <button
                                                className={styles.mypage__textBtn}
                                                style={{ color: '#999', textDecoration: 'underline', fontSize: '14px' }}
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
                    )


                case "jobs":
                    return (
                        <div className={styles.mypage__section}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <h2 className={styles.mypage__sectionTitle}>{t.jobs.title}</h2>
                                <select
                                    value={jobSort}
                                    onChange={(e) => setJobSort(e.target.value as 'latest' | 'oldest')}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border: '2px solid #000',
                                        fontWeight: 700,
                                        background: '#fff',
                                    }}
                                >
                                    <option value="latest">{t.jobs?.sortLatest || '최신순'}</option>
                                    <option value="oldest">{t.jobs?.sortOldest || '오래된순'}</option>
                                </select>
                            </div>
                            {jobsList.length > 0 ? (
                                <div className={styles.mypage__jobs}>
                                    {[...jobsList]
                                        .sort((a, b) => jobSort === 'latest'
                                            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                        .map((job) => (
                                            <div
                                                key={job.id}
                                                className={styles.mypage__job}
                                                onClick={() => handleJobClick(job)}
                                            >
                                                <div className={styles.mypage__jobThumbData} style={{ position: 'relative', overflow: 'hidden' }}>
                                                    <img src={job.sourceImageUrl || "/placeholder.png"} alt={job.title} className={styles.mypage__jobThumb} />



                                                    <div className={styles.mypage__jobOverlay}>
                                                        <span className={`${styles.mypage__jobStatus} ${styles[getStatusClass(job.status)]}`}>
                                                            {getStatusLabel(job.status)}
                                                        </span>
                                                    </div>
                                                    <div className={styles.mypage__jobActionOverlay}>
                                                        {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                                                            <button
                                                                className={styles.mypage__jobCancelBtn}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCancelJob(job.id);
                                                                }}
                                                                title={t.common.cancel}
                                                            >
                                                                <Icons.X width={16} height={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={styles.mypage__jobInfo}>
                                                    <div className={styles.mypage__jobTitle}>{job.title || "Untitled"}</div>
                                                    <div className={styles.mypage__jobDate}>{formatDate(job.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    <div ref={jobsSentinelRef} style={{ height: 1 }} />
                                </div>
                            ) : (
                                <p className={styles.mypage__empty}>{t.jobs.empty}</p>
                            )}
                            {jobsLoading && (
                                <div style={{ marginTop: 16, fontWeight: 700 }}>{t.common.loading}...</div>
                            )}
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
                                <p>{t.mypage.preparing}</p>
                            </div>
                        </div>
                    );
            }
        };

        return (
            <div className={`${styles.mypage} ${styles['lang-' + language]}`}>
                <BackgroundBricks />
                <div className={styles.mypage__container}>
                    <div className={styles.mypage__layout}>
                        <button className={styles.mypage__exitBtn} onClick={() => router.back()}>
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
                                className={`${styles.mypage__closeBtn} ${styles.dark}`}
                                onClick={() => setMenuJob(null)}
                            >
                                ✕
                            </button>
                            <div className={styles.mypage__menuHeader} style={{ paddingRight: '60px' }}>
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
                                    className={`${styles.mypage__menuItem2}`}
                                    onClick={() => handleMenuAction('preview')}
                                    disabled={!menuJob.sourceImageUrl}
                                >
                                    <Icons.Search className={styles.mypage__menuIcon2} />
                                    <span>{t.jobs.menu?.previewImage}</span>
                                </button>
                                <button
                                    className={`${styles.mypage__menuItem2}`}
                                    onClick={() => handleMenuAction('view')}
                                    disabled={!menuJob.ldrUrl}
                                >
                                    <Icons.Layers className={styles.mypage__menuIcon2} />
                                    <span>{t.jobs.menu?.viewBlueprint}</span>
                                </button>

                                <div className={styles.mypage__menuDivider} />

                                <button
                                    className={`${styles.mypage__menuItem2}`}
                                    onClick={() => handleShare(menuJob)}
                                >
                                    <Icons.Share className={styles.mypage__menuIcon2} />
                                    <span>{t.detail?.share || "공유"}</span>
                                </button>

                                {/* PDF Download Button */}
                                {menuJob.instructionsPdfUrl && (
                                    <button
                                        className={`${styles.mypage__menuItem2} ${styles.primary}`}
                                        onClick={() => handleMenuAction('pdf')}
                                    >
                                        <Icons.DownloadFile className={styles.mypage__menuIcon2} />
                                        <span>{t.jobs?.menu?.downloadPdf || 'Download PDF'}</span>
                                    </button>
                                )}

                                <div className={styles.mypage__menuDivider} />

                                {/* <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('source')}
                                disabled={!menuJob.sourceImageUrl}
                            >
                                <Icons.DownloadImage className={styles.mypage__menuIcon2} />
                                <span>{t.jobs.menu?.sourceImage || '원본 이미지 다운로드'}</span>
                            </button>
                            <button
                                className={styles.mypage__menuItem2}
                                onClick={() => handleMenuAction('corrected')}
                                disabled={!menuJob.correctedImageUrl}
                            >
                                <Icons.DownloadImage className={styles.mypage__menuIcon2} />
                                <span>{t.jobs?.menu?.downloadEnhanced || 'Download Enhanced Image'}</span>
                            </button>

                            <div className={styles.mypage__menuDivider} /> */}

                                <button
                                    className={styles.mypage__menuItem2}
                                    onClick={() => handleMenuAction('glb')}
                                    disabled={!menuJob.glbUrl}
                                >
                                    <Icons.DownloadImage className={styles.mypage__menuIcon2} />
                                    <span>{t.jobs.menu?.glbFile}</span>
                                </button>
                                <button
                                    className={styles.mypage__menuItem2}
                                    onClick={() => handleMenuAction('ldr')}
                                    disabled={!menuJob.ldrUrl}
                                >
                                    <Icons.DownloadFile className={styles.mypage__menuIcon2} />
                                    <span>{t.jobs.menu?.ldrFile}</span>
                                </button>

                                <div className={styles.mypage__menuDivider} />

                                <button
                                    className={`${styles.mypage__menuItem2} ${styles.danger}`}
                                    onClick={() => handleReportJob(menuJob)}
                                    style={{ color: '#ef4444' }}
                                >
                                    <Icons.AlertTriangle className={styles.mypage__menuIcon2} />
                                    <span>{t.jobs.menu?.report}</span>
                                </button>


                                <div className={styles.mypage__menuDivider} />
                                {/* <button
                                className={`${styles.mypage__menuItem2} ${styles.primary}`}></button> */}
                                {/* 색상 변경 버튼 - 마이페이지에서는 숨김 (나중에 활성화 가능)
                            <div className="h-px bg-[#eee] my-2" />
                            <button
                                className="flex items-center gap-3 p-[16px_20px] bg-[#f8f9fa] border border-[#eee] rounded-2xl text-[15px] font-bold text-[#333] cursor-pointer transition-all duration-200 text-left hover:bg-black hover:text-white hover:translate-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={openColorModal}
                                disabled={!menuJob.ldrUrl}
                            >
                                <Icons.Edit className={styles.mypage__menuIcon2} />
                                <span>{t.kids.steps?.changeColor || '색상 변경'}</span>
                            </button>
                            */}
                            </div>
                        </div>
                    </div>
                )}

                {/* 이미지 원본 보기 모달 */}
                {previewImage && (
                    <div className={styles.mypage__imagePreviewOverlay} onClick={() => setPreviewImage(null)}>
                        <button
                            className={styles.mypage__imagePreviewClose}
                            onClick={() => setPreviewImage(null)}
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage}
                            alt="Original"
                            className={styles.mypage__imagePreviewImg}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {/* 3D 뷰어 모달 */}
                {selectedJob && (
                    <div className={styles.mypage__modalOverlay}>
                        <div className={styles.mypage__modalContent} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', maxWidth: '900px', width: '90%' }}>
                            <div className={styles.mypage__previewHead}>
                                <div className={styles.mypage__previewTitle}>
                                    {jobViewStep === "preview" ? t.kids.modelSelect.previewTitle : t.kids.steps.startAssembly}
                                </div>
                                <div className={styles.mypage__previewSub}>
                                    {jobViewStep === "preview" ? t.kids.modelSelect.previewSub : t.kids.steps.preview}
                                </div>
                                <button className={`${styles.mypage__closeBtn} ${styles.dark}`} style={{ top: '8px', right: '8px' }} onClick={() => setSelectedJob(null)}>
                                    ✕
                                </button>
                            </div>

                            <div className={styles.mypage__previewViewer}>
                                {selectedJob.ldrUrl ? (
                                    <KidsLdrPreview url={selectedJob.ldrUrl} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[#999]">
                                        {t.common.noPreview}
                                    </div>
                                )}
                            </div>

                            <div className={styles.mypage__previewActions}>
                                {jobViewStep === "preview" ? (
                                    <button
                                        className={styles.mypage__previewNextBtn}
                                        onClick={() => setJobViewStep("start")}
                                    >
                                        {t.kids.steps.startAssembly}
                                    </button>
                                ) : (
                                    <button
                                        className={styles.mypage__previewNextBtn}
                                        onClick={() => {
                                            const url = selectedJob.ldrUrl;
                                            if (!url) return;
                                            setSelectedJob(null);
                                            router.push(`/kids/steps?url=${encodeURIComponent(url)}&jobId=${selectedJob.id}&isPreset=true`);
                                        }}
                                    >
                                        {t.jobs.menu.viewBlueprint}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 색상 변경 모달 */}
                {isColorModalOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] grid place-items-center z-[2000]" onClick={() => setIsColorModalOpen(false)}>
                        <div className="bg-white border-[3px] border-black rounded-[20px] p-8 w-[min(400px,90vw)] flex flex-col gap-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative" onClick={(e) => e.stopPropagation()}>
                            <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-100 text-black z-[100] hover:rotate-90 hover:scale-110" onClick={() => setIsColorModalOpen(false)}>✕</button>
                            <h3 className="text-[24px] font-black m-0 text-center">{t.kids.steps.colorThemeTitle}</h3>

                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                {colorThemes.length === 0 ? (
                                    <div className="p-5 text-center text-[#888]">{t.kids.steps?.themeLoading || t.common.loading}</div>
                                ) : (
                                    colorThemes.map((theme: any) => (
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
                                    {t.common.cancel}
                                </button>
                                <button
                                    className="flex-1 p-3 rounded-xl border-2 border-black font-[800] cursor-pointer transition-all duration-200 bg-black text-white hover:-translate-y-[0.5] disabled:opacity-50"
                                    onClick={handleApplyColor}
                                    disabled={!selectedTheme || isApplyingColor}
                                >
                                    {isApplyingColor ? (t.common?.applying || '...') : (t.common?.apply || '적용')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 색상 변경된 LDR 다운로드 모달 
            {colorChangedLdrBase64 && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] grid place-items-center z-[2000]" onClick={() => setColorChangedLdrBase64(null)}>
                    <div className="bg-white border-[3px] border-black rounded-[20px] p-8 w-[min(400px,90vw)] flex flex-col gap-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-100 text-black z-[100] hover:rotate-90 hover:scale-110" onClick={() => setColorChangedLdrBase64(null)}>✕</button>
                        <h3 className="text-[24px] font-black m-0 text-center">{t.common?.colorChangeComplete}</h3>
                        <p className="text-center text-[#666]">{selectedTheme} {t.common?.themeApplied}</p>
                        <button
                            className="w-full p-4 rounded-xl border-2 border-black font-[800] cursor-pointer transition-all duration-200 bg-[#4CAF50] text-white hover:-translate-y-[2px]"
                            onClick={() => { downloadColorChangedLdr(); setColorChangedLdrBase64(null); }}
                        >
                            {t.common?.downloadChangedLdr}
                        </button>
                    </div>
                </div>
            )}
                */}


                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => {
                        setShareModalOpen(false);
                        setShareJob(null);
                    }}
                    backgroundUrl={shareImageUrl}
                    ldrUrl={shareJob?.ldrUrl || null}
                    loading={shareLoading}
                />
            </div>
        );
    }

    export default function MyPage() {
        return (
            <Suspense fallback={<div className={styles.mypage__loading}>Loading...</div>}>
                <MyPageContent />
            </Suspense>
        );
    }
