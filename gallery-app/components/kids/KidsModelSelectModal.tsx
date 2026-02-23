'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import UpgradeModal from "@/components/common/UpgradeModal";
import KidsDrawingCanvas from "./KidsDrawingCanvas";
import * as gtag from "@/lib/gtag";

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
            <div className="fixed inset-0 z-[2000] bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
                <div className="w-[min(900px,96vw)] rounded-[20px] bg-white/95 backdrop-blur-[10px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {step === 'select' ? (
                        <>
                            <div className="relative px-5 pt-4 pb-2.5">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.title}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.sub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-3 px-5 pb-4">


                                {items.map((it) => (
                                    <div
                                        key={it.url}
                                        className={`rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden border-3 cursor-pointer transition-[border-color] duration-200 hover:border-black/15 ${selectedUrl === it.url ? "border-blue-500" : "border-transparent"}`}
                                        onClick={() => handleModelClick(it.url)}
                                    >
                                        <div className="h-[200px] max-[600px]:h-[150px] p-2 relative">
                                            {it.thumbnail ? (
                                                <Image
                                                    src={it.thumbnail}
                                                    alt={it.title}
                                                    fill
                                                    style={{ objectFit: "contain" }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[#999]">
                                                    {t.common.noPreview}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-3">
                                            <div className="text-base font-black text-[#111]">{it.title}</div>
                                            <div className={`text-[13px] font-bold py-1.5 px-3 rounded-full ${selectedUrl === it.url ? "bg-blue-500 text-white" : "text-[#666] bg-black/6"}`}>{t.kids.modelSelect.pick}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>



                            {/* 이미지 업로드 영역 */}
                            <div
                                className={`mx-5 mb-4 p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-[border-color,background] duration-200 hover:border-blue-500 hover:bg-blue-500/5 ${dragOver ? "border-blue-500 bg-blue-500/5" : "border-black/15"}`}
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
                                    className="absolute w-0 h-0 p-0 overflow-hidden border-0"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFile(f);
                                    }}
                                />
                                {previewUrl ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Image src={previewUrl} alt="preview" width={120} height={120} className="max-h-[120px] max-w-full object-contain rounded-lg" />
                                        <div className="text-xs text-[#666]">{file?.name}</div>
                                    </div>
                                ) : (
                                    <>
                                        {items.length > 0 && <div className="text-base font-extrabold text-[#333]">{t.kids.modelSelect.uploadTitle}</div>}
                                        <div className="mt-1 text-[13px] text-[#888]">{t.kids.modelSelect.uploadSub}</div>
                                        <div className="mt-1.5 text-xs text-[#aaa]">{t.kids.modelSelect.uploadHint}</div>
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#ff4444', fontWeight: 'bold' }}>
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

                            <div className="px-5 pb-5" style={{ marginTop: '10px' }}>
                                <button
                                    className="w-full p-3.5 border-0 rounded-xl bg-[#111] text-white text-base font-black cursor-pointer transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    disabled={!canSubmit}
                                    onClick={handleConfirm}
                                >
                                    {t.kids.modelSelect.confirm}
                                </button>
                            </div>
                        </>
                    ) : step === 'draw' ? (
                        <>
                            <div className="relative px-5 pt-4 pb-2.5">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.drawTitle}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.drawSub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
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
                            <div className="relative px-5 pt-4 pb-2.5">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.promptTitle}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.promptSub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="text-base font-extrabold text-[#333]">{t.kids.modelSelect.promptInputTitle}</div>
                                <textarea
                                    className="w-full h-[120px] p-4 border-2 border-black/10 rounded-xl text-lg resize-none font-[inherit] transition-[border-color] duration-200 focus:outline-none focus:border-blue-500"
                                    placeholder={t.kids.modelSelect.promptInputPlaceholder}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <div className="mt-1.5 text-xs text-[#aaa]">{t.kids.modelSelect.promptInputHint}</div>
                                <div className="px-5 pb-5">
                                    <button
                                        className="w-full p-3.5 border-0 rounded-xl bg-[#111] text-white text-base font-black cursor-pointer transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        disabled={!prompt.trim()}
                                        onClick={() => {
                                            gtag.trackUserFeedback({ action: 'search', search_term: prompt });
                                            onSelect(null, null, prompt);
                                        }}
                                    >
                                        {t.kids.modelSelect.promptConfirm}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative px-5 pt-4 pb-2.5">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.previewTitle}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.previewSub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>

                            <div className="w-full h-[400px] max-[600px]:h-[300px] mx-5 max-w-[calc(100%-40px)] rounded-xl overflow-hidden bg-[#f8f9fa] relative">
                                {selectedUrl && <KidsLdrPreview url={selectedUrl} />}
                            </div>

                            <div className="px-5 pb-5" style={{ marginTop: 16 }}>
                                <button
                                    className="w-full bg-black text-white py-3.5 px-8 rounded-full font-bold text-base cursor-pointer border-none"
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
