'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import UpgradeModal from "@/components/UpgradeModal";
import KidsDrawingCanvas from "./KidsDrawingCanvas";
import styles from "./KidsModelSelectModal.module.css";

// SSR 제외
const KidsLdrPreview = dynamic(() => import("./KidsLdrPreview"), { ssr: false });

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (url: string | null, file: File | null, prompt?: string) => void;
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

    const [prompt, setPrompt] = useState<string>("");
    const [step, setStep] = useState<'select' | 'preview' | 'draw' | 'prompt'>('select');

    const isPro = user?.membershipPlan === "PRO";
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [fileSizeError, setFileSizeError] = useState(false);

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

    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const handleFile = (f: File) => {
        setFileSizeError(false);
        if (!ALLOWED_TYPES.includes(f.type)) return;
        if (f.size > MAX_FILE_SIZE) {
            setFileSizeError(true);
            return;
        }
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
                                    accept="image/png,image/jpeg,image/webp,image/avif"
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
                                            {t.kids.modelSelect?.freeUserNotice || '* Free users need to upgrade'}
                                        </div>
                                        {fileSizeError && (
                                            <div style={{ marginTop: '8px', fontSize: '13px', color: '#ff4444', fontWeight: 'bold' }}>
                                                {t.kids.modelSelect?.fileTooLarge || 'File size must be under 10MB'}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
                                <button
                                    onClick={() => {
                                        if (!isAuthenticated) { router.push('?login=true'); return; }
                                        setStep('draw');
                                    }}
                                    style={{
                                        flex: 1,
                                        background: '#fff',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: '12px',
                                        padding: '14px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#000';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fff';
                                        e.currentTarget.style.color = '#000';
                                    }}
                                >
                                    {t.kids.modelSelect.drawTitle || "그림으로 만들기"}
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isAuthenticated) { router.push('?login=true'); return; }
                                        setStep('prompt');
                                    }}
                                    style={{
                                        flex: 1,
                                        background: '#fff',
                                        color: '#000',
                                        border: '2px solid #000',
                                        borderRadius: '12px',
                                        padding: '14px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#000';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fff';
                                        e.currentTarget.style.color = '#000';
                                    }}
                                >
                                    {t.kids.modelSelect.promptTitle || "글자로 만들기"}
                                </button>
                            </div>

                            <div className={styles.actions} style={{ marginTop: '10px' }}>
                                <button
                                    className={styles.confirmBtn}
                                    disabled={!canSubmit}
                                    onClick={handleConfirm}
                                >
                                    {t.kids.modelSelect.confirm}
                                </button>
                            </div>
                        </>
                    ) : step === 'draw' ? (
                        <>
                            <div className={styles.head}>
                                <div className={styles.title}>{t.kids.modelSelect.drawTitle}</div>
                                <div className={styles.sub}>{t.kids.modelSelect.drawSub}</div>
                                <button className={styles.close} onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>
                            <div style={{ height: '70vh', padding: '0 20px 20px', display: 'flex', flexDirection: 'column' }}>
                                <KidsDrawingCanvas
                                    onCancel={() => setStep('select')}
                                    onDone={(f) => {
                                        onSelect(null, f);
                                    }}
                                />
                            </div>
                        </>
                    ) : step === 'prompt' ? (
                        <>
                            <div className={styles.head}>
                                <div className={styles.title}>{t.kids.modelSelect.promptTitle}</div>
                                <div className={styles.sub}>{t.kids.modelSelect.promptSub}</div>
                                <button className={styles.close} onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>
                            <div className={styles.promptInputArea}>
                                <div className={styles.uploadTitle}>{t.kids.modelSelect.promptInputTitle}</div>
                                <textarea
                                    className={styles.promptInput}
                                    placeholder={t.kids.modelSelect.promptInputPlaceholder}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <div className={styles.uploadHint}>{t.kids.modelSelect.promptInputHint}</div>
                                <div className={styles.actions}>
                                    <button
                                        className={styles.confirmBtn}
                                        disabled={!prompt.trim()}
                                        onClick={() => onSelect(null, null, prompt)}
                                    >
                                        {t.kids.modelSelect.promptConfirm}
                                    </button>
                                </div>
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
            </div >

            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </>
    );
}
