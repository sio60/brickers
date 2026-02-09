'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import UpgradeModal from "@/components/UpgradeModal";
import styles from "./KidsModelSelectModal.module.css";

// SSR 제외
const KidsLdrPreview = dynamic(() => import("./KidsLdrPreview"), { ssr: false });

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (url: string | null, file: File | null) => void;
    items: { title: string; url: string; thumbnail?: string }[];
};

export default function KidsModelSelectModal({ open, onClose, onSelect, items }: Props) {
    const router = useRouter();
    const { t } = useLanguage();
    const { isAuthenticated, user } = useAuth();

    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [step, setStep] = useState<'select' | 'preview'>('select');

    const isPro = user?.membershipPlan === "PRO";
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        if (!open) {
            setStep('select');
            setSelectedUrl(null);
        }
    }, [open]);

    if (!open) return null;

    const handleModelClick = (url: string) => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }
        setSelectedUrl(url);
        setStep('preview');
    };

    const handleGoToSteps = () => {
        if (selectedUrl) {
            onClose();
            router.push(`/kids/steps?url=${encodeURIComponent(selectedUrl)}&isPreset=true`);
        }
    };

    const handleFile = (f: File) => {
        if (!f.type.startsWith("image/")) return;
        setFile(f);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(f));
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);

        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const handleUploadClick = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        inputRef.current?.click();
    };

    const handleConfirm = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        // FREE 유저 차단 - UpgradeModal 표시
        if (!isPro) {
            setShowUpgrade(true);
            return;
        }

        if (file || selectedUrl) {
            onSelect(selectedUrl, file);
        }
    };

    const canSubmit = !!file || !!selectedUrl;

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    {step === 'select' ? (
                        <>
                            {items.length > 0 && (
                                <>
                                    <div className={styles.head}>
                                        <div className={styles.title}>{t.kids.modelSelect.title}</div>
                                        <div className={styles.sub}>{t.kids.modelSelect.sub}</div>
                                        <button className={styles.close} onClick={onClose} aria-label="close">
                                            ✕
                                        </button>
                                    </div>

                                    <div className={styles.grid}>
                                        {items.map((it) => (
                                            <div
                                                key={it.url}
                                                className={`${styles.card} ${selectedUrl === it.url ? styles.isSelected : ""}`}
                                                onClick={() => handleModelClick(it.url)}
                                            >
                                                <div className={styles.cardViewer}>
                                                    {it.thumbnail ? (
                                                        <Image
                                                            src={it.thumbnail}
                                                            alt={it.title}
                                                            fill
                                                            style={{ objectFit: "contain" }}
                                                        />
                                                    ) : (
                                                        <div className={styles.noPreview}>
                                                            {t.common.noPreview}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={styles.cardFooter}>
                                                    <div className={styles.cardLabel}>{it.title}</div>
                                                    <div className={styles.cardPick}>{t.kids.modelSelect.pick}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {items.length === 0 && (
                                <div className={styles.head}>
                                    <div className={styles.title}>{t.kids.modelSelect.uploadTitle}</div>
                                    <button className={styles.close} onClick={onClose} aria-label="close">
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* 이미지 업로드 영역 */}
                            <div
                                className={`${styles.upload} ${dragOver ? styles.isDragOver : ""} ${file ? styles.hasFile : ""}`}
                                onClick={handleUploadClick}
                                onDragEnter={() => setDragOver(true)}
                                onDragLeave={() => setDragOver(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={onDrop}
                                style={items.length === 0 ? { marginTop: '20px' } : {}}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="image/*"
                                    className={styles.hiddenInput}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFile(f);
                                    }}
                                />
                                {previewUrl ? (
                                    <div className={styles.uploadPreviewWrap}>
                                        <Image src={previewUrl} alt="preview" width={120} height={120} className={styles.uploadPreview} />
                                        <div className={styles.uploadFilename}>{file?.name}</div>
                                    </div>
                                ) : (
                                    <>
                                        {items.length > 0 && <div className={styles.uploadTitle}>{t.kids.modelSelect.uploadTitle}</div>}
                                        <div className={styles.uploadSub}>{t.kids.modelSelect.uploadSub}</div>
                                        <div className={styles.uploadHint}>{t.kids.modelSelect.uploadHint}</div>
                                        <div className={styles.uploadNotice} style={{ marginTop: '8px', fontSize: '13px', color: '#ff4444', fontWeight: 'bold' }}>
                                            * 무료 회원은 결제 후 이용 가능합니다
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className={styles.actions}>
                                <button
                                    className={styles.confirmBtn}
                                    disabled={!canSubmit}
                                    onClick={handleConfirm}
                                >
                                    {t.kids.modelSelect.confirm}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.head}>
                                <div className={styles.title}>{t.kids.modelSelect.previewTitle}</div>
                                <div className={styles.sub}>{t.kids.modelSelect.previewSub}</div>
                                <button className={styles.close} onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>

                            <div className={styles.previewViewer}>
                                {selectedUrl && <KidsLdrPreview url={selectedUrl} />}
                            </div>

                            <div className={styles.actions} style={{ marginTop: 16 }}>
                                <button
                                    className={styles.nextBtn}
                                    onClick={handleGoToSteps}
                                >
                                    {t.kids.generate.next}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </>
    );
}
