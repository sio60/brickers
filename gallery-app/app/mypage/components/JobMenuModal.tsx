'use client';

import React from "react";
import { Icons } from "./Icons";
import styles from "../MyPage.module.css";

interface JobMenuModalProps {
    t: any;
    menuJob: any;
    onClose: () => void;
    handleMenuAction: (action: string) => void;
    handleShare: (job: any) => void;
    handleReportJob: (job: any) => void;
    handleEditGalleryOpen: () => void;
    formatDate: (d: string) => string;
}

export default function JobMenuModal({
    t,
    menuJob,
    onClose,
    handleMenuAction,
    handleShare,
    handleReportJob,
    handleEditGalleryOpen,
    formatDate,
}: JobMenuModalProps) {
    if (!menuJob) return null;

    return (
        <div className={styles.mypage__modalOverlay} onClick={onClose}>
            <div className={styles.mypage__menuModal} onClick={e => e.stopPropagation()}>
                <button
                    className={`${styles.mypage__closeBtn} ${styles.dark}`}
                    onClick={onClose}
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
                        onClick={handleEditGalleryOpen}
                    >
                        <Icons.Edit className={styles.mypage__menuIcon2} />
                        <span>{t.detail?.edit || "정보 수정"}</span>
                    </button>
                    <div className={styles.mypage__menuDivider} />

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
                        className={styles.mypage__menuItem2}
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
    );
}
