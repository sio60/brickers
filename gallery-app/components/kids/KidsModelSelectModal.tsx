'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import UpgradeModal from "@/components/UpgradeModal";
// import styles from "./KidsModelSelectModal.module.css"; // Removed

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
            <div className="fixed inset-0 z-[2000] bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
                <div className="w-[min(900px,96vw)] rounded-[20px] bg-white/95 backdrop-blur-[10px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {step === 'select' ? (
                        <>
                            <div className="relative p-[16px_20px_10px]">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.title}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.sub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-[0_20px_16px] sm:grid-cols-1">
                                {items.map((it) => (
                                    <div
                                        key={it.url}
                                        className={`rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden border-[3px] cursor-pointer transition-colors duration-200 ${selectedUrl === it.url ? "border-[#3b82f6]" : "border-transparent hover:border-black/15"}`}
                                        onClick={() => handleModelClick(it.url)}
                                    >
                                        <div className="h-[200px] p-2 relative sm:h-[150px]">
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

                                        <div className="flex items-center justify-between gap-2 p-[8px_12px_12px]">
                                            <div className="text-base font-black text-[#111]">{it.title}</div>
                                            <div className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${selectedUrl === it.url ? "bg-[#3b82f6] text-white" : "text-[#666] bg-black/6"}`}>{t.kids.modelSelect.pick}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 이미지 업로드 영역 */}
                            <div
                                className={`m-[0_20px_16px] p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors duration-200 ${dragOver || file ? "border-[#3b82f6] bg-[#3b82f6]/5" : "border-black/15 hover:border-[#3b82f6] hover:bg-[#3b82f6]/5"}`}
                                onClick={handleUploadClick}
                                onDragEnter={() => setDragOver(true)}
                                onDragLeave={() => setDragOver(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={onDrop}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="image/*"
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
                                        <div className="text-base font-extrabold text-[#333]">{t.kids.modelSelect.uploadTitle}</div>
                                        <div className="mt-1 text-[13px] text-[#888]">{t.kids.modelSelect.uploadSub}</div>
                                        <div className="mt-1.5 text-xs text-[#aaa]">{t.kids.modelSelect.uploadHint}</div>
                                        <div className="mt-2 text-[13px] text-[#ff4444] font-bold">
                                            * 무료 회원은 결제 후 이용 가능합니다
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="p-[0_20px_20px]">
                                <button
                                    className="w-full p-3.5 border-0 rounded-xl bg-[#111] text-white text-base font-black cursor-pointer transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    disabled={!canSubmit}
                                    onClick={handleConfirm}
                                >
                                    {t.kids.modelSelect.confirm}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative p-[16px_20px_10px]">
                                <div className="text-2xl font-black text-[#111]">{t.kids.modelSelect.previewTitle}</div>
                                <div className="mt-1 text-[13px] font-extrabold text-black/50">{t.kids.modelSelect.previewSub}</div>
                                <button className="absolute right-4 top-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose} aria-label="close">
                                    ✕
                                </button>
                            </div>

                            <div className="w-full h-[400px] mx-5 max-w-[calc(100%-40px)] rounded-xl overflow-hidden bg-[#f8f9fa] relative sm:h-[300px]">
                                {selectedUrl && <KidsLdrPreview url={selectedUrl} />}
                            </div>

                            <div className="p-[0_20px_20px]" style={{ marginTop: 16 }}>
                                <button
                                    className="w-full bg-black text-white p-[14px_32px] rounded-full font-bold text-base cursor-pointer border-none"
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
