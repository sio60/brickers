"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./MyPage.module.css";

import ShareModal from "@/components/kids/ShareModal";
import BackgroundBricks from "@/components/layout/BackgroundBricks";
import UpgradeModal from "@/components/common/UpgradeModal";
import EditGalleryModal from "@/components/gallery/EditGalleryModal";

// Hooks
import useMyPageData, { type MenuItem } from "@/hooks/useMyPageData";
import useJobActions from "@/hooks/useJobActions";

// Components
import { Icons } from "./components/Icons";
import ProfileTab from "./components/ProfileTab";
import MembershipTab from "./components/MembershipTab";
import JobsTab from "./components/JobsTab";
import InquiriesTab from "./components/InquiriesTab";
import ReportsTab from "./components/ReportsTab";
import RefundsTab from "./components/RefundsTab";
import SettingsTab from "./components/SettingsTab";
import JobMenuModal from "./components/JobMenuModal";
import ImagePreviewModal from "./components/ImagePreviewModal";
import JobViewerModal from "./components/JobViewerModal";

function MyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language, setLanguage, t } = useLanguage();
    const { isAuthenticated, isLoading, authFetch, setUser } = useAuth();

    // === Custom Hooks ===
    const pageData = useMyPageData({
        language,
        isAuthenticated,
        isAuthLoading: isLoading,
        authFetch,
        setUser,
        t,
    });

    const actions = useJobActions({
        t,
        authFetch,
        refreshOverview: pageData.refreshOverview,
        resetAndLoadJobs: pageData.resetAndLoadJobs,
        onProfileUpdated: pageData.setProfile,
    });

    // Auth redirect
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/?login=true");
        }
    }, [isLoading, isAuthenticated, router]);

    // URL searchParam sync for activeMenu
    useEffect(() => {
        const menu = searchParams.get('menu');
        if (menu && ['profile', 'membership', 'jobs', 'inquiries', 'reports', 'refunds', 'settings', 'delete'].includes(menu)) {
            pageData.setActiveMenu(menu as MenuItem);
        }
    }, [searchParams]);

    // === Sidebar menu items ===
    const menuItems: { id: MenuItem; label: string }[] = [
        { id: "profile", label: t.menu.profile },
        { id: "membership", label: t.menu.membership },
        { id: "jobs", label: t.menu.jobs },
        { id: "inquiries", label: t.menu.inquiries },
        { id: "reports", label: t.menu.reports },
        { id: "refunds", label: (t.menu as any).refunds },
        { id: "settings", label: t.menu.settings },
    ];

    const menuIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
        profile: Icons.User,
        membership: Icons.CreditCard,
        jobs: Icons.Briefcase,
        inquiries: Icons.Mail,
        reports: Icons.AlertTriangle,
        refunds: Icons.Receipt,
        settings: Icons.Settings,
    };

    // === Tab content ===
    const renderContent = () => {
        if (pageData.loading) return <div className={styles.mypage__loading}>{t.common.loading}...</div>;

        if (pageData.error) {
            return (
                <div className={styles.mypage__error}>
                    <Icons.AlertTriangle />
                    <p>{pageData.error.message}</p>
                    <button className={styles.mypage__btn3d} onClick={() => window.location.reload()}>
                        {t.common.retryBtn}
                    </button>
                </div>
            );
        }

        switch (pageData.activeMenu) {
            case "profile":
                return <ProfileTab t={t} profile={pageData.profile} data={pageData.data} isEditing={pageData.isEditing} editNickname={pageData.editNickname} setEditNickname={pageData.setEditNickname} editBio={pageData.editBio} setEditBio={pageData.setEditBio} saving={pageData.saving} startEditing={pageData.startEditing} cancelEditing={pageData.cancelEditing} saveProfile={pageData.saveProfile} formatDate={pageData.formatDate} />;
            case "membership":
                return <MembershipTab t={t} profile={pageData.profile} isCancelModalOpen={actions.isCancelModalOpen} setIsCancelModalOpen={actions.setIsCancelModalOpen} isCancelling={actions.isCancelling} handleCancelMembership={actions.handleCancelMembership} />;
            case "jobs":
                return <JobsTab t={t} jobsList={pageData.jobsList} jobsLoading={pageData.jobsLoading} jobSort={pageData.jobSort} setJobSort={pageData.setJobSort} handleJobClick={actions.handleJobClick} handleCancelJob={actions.handleCancelJob} formatDate={pageData.formatDate} getStatusLabel={pageData.getStatusLabel} getStatusClass={pageData.getStatusClass} jobsSentinelRef={pageData.jobsSentinelRef} />;
            case "inquiries":
                return <InquiriesTab t={t} inquiries={pageData.inquiries} listLoading={pageData.listLoading} expandedInquiryId={pageData.expandedInquiryId} setExpandedInquiryId={pageData.setExpandedInquiryId} getInquiryStatusLabel={pageData.getInquiryStatusLabel} formatDate={pageData.formatDate} />;
            case "reports":
                return <ReportsTab t={t} reports={pageData.reports} listLoading={pageData.listLoading} expandedReportId={pageData.expandedReportId} setExpandedReportId={pageData.setExpandedReportId} getReportStatusLabel={pageData.getReportStatusLabel} getReportReasonLabel={pageData.getReportReasonLabel} getReportTargetLabel={pageData.getReportTargetLabel} formatDate={pageData.formatDate} />;
            case "refunds":
                return <RefundsTab t={t} refundOrders={pageData.refundOrders} refundLoading={pageData.refundLoading} getRefundStatusLabel={pageData.getRefundStatusLabel} getRefundStatusClass={pageData.getRefundStatusClass} formatDate={pageData.formatDate} />;
            case "settings":
                return <SettingsTab t={t} language={language} setLanguage={setLanguage} />;
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

    // === Render ===
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
                            {menuItems.slice(0, 2).map((item) => {
                                const Icon = menuIcons[item.id];
                                return (
                                    <button key={item.id} className={`${styles.mypage__menuItem} ${pageData.activeMenu === item.id ? styles.active : ''}`} onClick={() => pageData.setActiveMenu(item.id)}>
                                        <Icon className={styles.mypage__menuIcon} /> {item.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.mypage__menuGroup}>
                            {menuItems.slice(2, 6).map((item) => {
                                const Icon = menuIcons[item.id];
                                return (
                                    <button key={item.id} className={`${styles.mypage__menuItem} ${pageData.activeMenu === item.id ? styles.active : ''}`} onClick={() => pageData.setActiveMenu(item.id)}>
                                        <Icon className={styles.mypage__menuIcon} /> {item.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.mypage__menuGroup}>
                            {menuItems.slice(6).map((item) => {
                                const Icon = menuIcons[item.id];
                                return (
                                    <button key={item.id} className={`${styles.mypage__menuItem} ${pageData.activeMenu === item.id ? styles.active : ''}`} onClick={() => pageData.setActiveMenu(item.id)}>
                                        <Icon className={styles.mypage__menuIcon} /> {item.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button className={styles.mypage__deleteLink} onClick={() => {/* Handle delete */}}>
                            {t.menu.delete} <Icons.LogOut width={16} height={16} />
                        </button>
                    </div>

                    <div className={styles.mypage__content}>
                        {renderContent()}
                    </div>

                    <div className={styles.mypage__decorations}>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#FFD600', height: '40px' }}></div>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#3b82f6', height: '30px' }}></div>
                        <div className={styles.mypage__decorationsBrick} style={{ backgroundColor: '#ef4444', height: '50px' }}></div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UpgradeModal isOpen={actions.showUpgrade} onClose={() => actions.setShowUpgrade(false)} />

            <JobMenuModal
                t={t}
                menuJob={actions.menuJob}
                onClose={() => actions.setMenuJob(null)}
                handleMenuAction={actions.handleMenuAction}
                handleShare={actions.handleShare}
                handleReportJob={actions.handleReportJob}
                handleEditGalleryOpen={actions.handleEditGalleryOpen}
                formatDate={pageData.formatDate}
            />

            <ImagePreviewModal
                previewImage={actions.previewImage}
                onClose={() => actions.setPreviewImage(null)}
            />

            <JobViewerModal
                t={t}
                selectedJob={actions.selectedJob}
                onClose={() => actions.setSelectedJob(null)}
                jobViewStep={actions.jobViewStep}
                setJobViewStep={actions.setJobViewStep}
                onStartAssembly={() => {
                    const job = actions.selectedJob;
                    if (!job?.ldrUrl) return;
                    actions.setSelectedJob(null);
                    router.push(`/kids/steps?url=${encodeURIComponent(job.ldrUrl)}&jobId=${job.id}&isPreset=true`);
                }}
            />

            <ShareModal
                isOpen={actions.shareModalOpen}
                onClose={() => { actions.setShareModalOpen(false); actions.setShareJob(null); }}
                backgroundUrl={actions.shareImageUrl}
                ldrUrl={actions.shareJob?.ldrUrl || null}
                loading={actions.shareLoading}
            />

            {actions.isEditGalleryModalOpen && actions.galleryEditTarget && (
                <EditGalleryModal
                    isOpen={actions.isEditGalleryModalOpen}
                    onClose={() => actions.setIsEditGalleryModalOpen(false)}
                    onSave={actions.handleEditGallerySave}
                    initialData={{
                        title: actions.galleryEditTarget.title || "",
                        content: actions.galleryEditTarget.description || "",
                        tags: actions.galleryEditTarget.tags || actions.galleryEditTarget.suggestedTags || [],
                        visibility: actions.galleryEditTarget.visibility || "PUBLIC"
                    }}
                />
            )}
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
