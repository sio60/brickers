'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { retryJob, cancelJob, cancelMembership, getMyProfile } from "@/lib/api/myApi";
import type { MyJob } from "@/lib/api/myApi";
import { updateGalleryPost } from "@/lib/api/galleryApi";

interface UseJobActionsParams {
    t: any;
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    refreshOverview: () => Promise<void>;
    resetAndLoadJobs: () => void;
    onProfileUpdated: (profile: any) => void;
}

export default function useJobActions({
    t,
    authFetch,
    refreshOverview,
    resetAndLoadJobs,
    onProfileUpdated,
}: UseJobActionsParams) {
    const router = useRouter();

    const [retrying, setRetrying] = useState<string | null>(null);
    const [menuJob, setMenuJob] = useState<MyJob | null>(null);
    const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
    const [jobViewStep, setJobViewStep] = useState<"preview" | "start">("preview");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // 공유하기 관련 상태
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
    const [shareJob, setShareJob] = useState<MyJob | null>(null);

    // 업그레이드 모달 상태
    const [showUpgrade, setShowUpgrade] = useState(false);

    // 멤버십 해지 모달 상태
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // 갤러리 수정 모달 상태
    const [isEditGalleryModalOpen, setIsEditGalleryModalOpen] = useState(false);
    const [galleryEditTarget, setGalleryEditTarget] = useState<MyJob | null>(null);

    // 색상 변경 관련 상태 (현재 마이페이지에서는 비활성화, 나중에 사용 가능)
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<any[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

    // --- Effects ---

    // Reset jobViewStep when selectedJob changes
    useEffect(() => {
        if (selectedJob) {
            setJobViewStep("preview");
        }
    }, [selectedJob]);

    // --- Helper ---

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

    // --- Handlers ---

    const handleRetry = async (jobId: string) => {
        try {
            setRetrying(jobId);
            await retryJob(jobId);
            await refreshOverview();
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
            await refreshOverview();
        } catch {
            alert(t.jobs.cancelFail);
        }
    };

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

    // 갤러리 수정 핸들러
    const handleEditGalleryOpen = () => {
        if (!menuJob) return;
        setGalleryEditTarget(menuJob);
        setIsEditGalleryModalOpen(true);
        setMenuJob(null); // 메뉴 닫기
    };

    const handleEditGallerySave = async (data: any) => {
        if (!galleryEditTarget) return;
        try {
            await updateGalleryPost(galleryEditTarget.id, data);
            alert("수정되었습니다.");
            // 목록 갱신 (간단히 리로드 혹은 리스트 업데이트)
            resetAndLoadJobs();
        } catch (e) {
            console.error("Update failed", e);
            throw e; // Modal logs error
        }
    };

    const handleCancelMembership = async () => {
        try {
            setIsCancelling(true);
            const res = await cancelMembership();
            if (res.success) {
                alert(t.membership.cancelSuccess || "멤버십 해지가 완료되었습니다.");
                setIsCancelModalOpen(false);
                // 프로필 정보 즉시 갱신
                const updatedProfile = await getMyProfile();
                onProfileUpdated(updatedProfile);
            } else {
                alert(res.message || "멤버십 해지에 실패했습니다.");
            }
        } catch (e: any) {
            alert(e.message || "멤버십 해지 중 오류가 발생했습니다.");
        } finally {
            setIsCancelling(false);
        }
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

    };

    return {
        // State
        retrying,
        menuJob,
        setMenuJob,
        selectedJob,
        setSelectedJob,
        jobViewStep,
        setJobViewStep,
        previewImage,
        setPreviewImage,
        shareModalOpen,
        setShareModalOpen,
        shareLoading,
        shareImageUrl,
        shareJob,
        setShareJob,
        showUpgrade,
        setShowUpgrade,
        isCancelModalOpen,
        setIsCancelModalOpen,
        isCancelling,
        isEditGalleryModalOpen,
        setIsEditGalleryModalOpen,
        galleryEditTarget,
        isColorModalOpen,
        setIsColorModalOpen,
        colorThemes,
        selectedTheme,
        setSelectedTheme,
        isApplyingColor,
        colorChangedLdrBase64,
        setColorChangedLdrBase64,

        // Functions
        handleRetry,
        handleCancelJob,
        handleJobClick,
        handleReportJob,
        handleMenuAction,
        handleShare,
        handleEditGalleryOpen,
        handleEditGallerySave,
        handleCancelMembership,
        openColorModal,
        handleApplyColor,
        downloadFile,
    };
}
