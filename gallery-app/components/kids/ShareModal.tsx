
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";

const KidsLdrPreview = dynamic(() => import("./KidsLdrPreview"), { ssr: false });

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    backgroundUrl: string | null;
    ldrUrl: string | null;
    loading: boolean;
}

export default function ShareModal({ isOpen, onClose, backgroundUrl, ldrUrl, loading }: ShareModalProps) {
    const { t } = useLanguage();
    const [working, setWorking] = useState(false);
    const previewRef = useRef<any>(null);
    const [previewLoaded, setPreviewLoaded] = useState(false);
    const handlePreviewLoaded = useCallback(() => setPreviewLoaded(true), []);

    const captureComposite = async (): Promise<Blob> => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");

        canvas.width = 1000;
        canvas.height = 1000;

        if (backgroundUrl) {
            // Use image proxy to bypass S3 CORS restrictions
            const proxyUrl = `/proxy/image?url=${encodeURIComponent(backgroundUrl)}`;
            const res = await fetch(proxyUrl);
            const blob = await res.blob();
            const bitmapUrl = URL.createObjectURL(blob);
            const bgImg = new Image();
            bgImg.src = bitmapUrl;
            await new Promise<void>((resolve, reject) => {
                bgImg.onload = () => resolve();
                bgImg.onerror = reject;
            });
            ctx.drawImage(bgImg, 0, 0, 1000, 1000);
            URL.revokeObjectURL(bitmapUrl);
        }

        if (previewRef.current) {
            const ldrSnapshot = previewRef.current.captureScreenshot();
            if (ldrSnapshot) {
                const modelImg = new Image();
                modelImg.src = ldrSnapshot;
                await new Promise((resolve, reject) => {
                    modelImg.onload = resolve;
                    modelImg.onerror = reject;
                });
                ctx.drawImage(modelImg, 0, 0, 1000, 1000);
            }
        }

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Blob generation failed"));
            }, "image/png");
        });
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) setPreviewLoaded(false);
    }, [isOpen]);

    // Early return AFTER all hooks — React requires hooks to run on every render
    if (!isOpen) return null;

    const handleDownload = async () => {
        setWorking(true);
        try {
            const blob = await captureComposite();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `brickers-share-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed:", e);
            alert("Download failed. Please try again.");
        } finally {
            setWorking(false);
        }
    };

    const handleShare = async () => {
        setWorking(true);
        try {
            const blob = await captureComposite();
            const file = new File([blob], "brick-model.png", { type: "image/png" });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Check out my Brickers model!",
                    text: "I made this with Brickers AI!",
                    files: [file],
                });
            } else {
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
                alert("Image copied to clipboard!");
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                console.error("Share failed", e);
                alert("Share failed. Please try again.");
            }
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative border-4 border-black/10">
                {/* Close Button */}
                {!loading && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/10 hover:bg-black/20 text-black rounded-full flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                )}

                <div className="p-8 text-center">
                    <h2 className="text-2xl font-black mb-2 text-gray-800">
                        {loading ? (t.kids?.share?.generating || "Generating...") : (t.kids?.share?.title || "Completed")}
                    </h2>
                    <p className="text-gray-500 mb-6 text-sm">
                        {loading ? "AI is creating a background for your model." : "Share your model with friends."}
                    </p>

                    <div
                        className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-6 flex items-center justify-center border-2 border-gray-200"
                    >
                        {backgroundUrl && (
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${backgroundUrl})` }}
                            />
                        )}
                        {ldrUrl ? (
                            <div className="absolute inset-0">
                                <KidsLdrPreview url={ldrUrl} autoRotate={false} ref={previewRef} onLoaded={handlePreviewLoaded} />
                            </div>
                        ) : null}

                        {(loading || !backgroundUrl || !ldrUrl) && (
                            <div className="flex flex-col items-center gap-3 z-10 bg-white/70 w-full h-full justify-center">
                                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-bold text-gray-400 animate-pulse">Processing...</span>
                            </div>
                        )}
                    </div>

                    {!loading && backgroundUrl && ldrUrl && (
                        <div className="flex gap-3">
                            <Button onClick={handleDownload} variant="secondary" disabled={working || !previewLoaded}>
                                {working ? "Saving..." : (t.kids?.share?.save || "Save")}
                            </Button>
                            <Button onClick={handleShare} variant="primary" disabled={working || !previewLoaded}>
                                {working ? "Processing..." : (t.kids?.share?.share || "Share")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Button({ children, onClick, variant = "primary", disabled }: any) {
    const base = "flex-1 py-3.5 px-6 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
    const styles = variant === "primary"
        ? "bg-black text-white hover:bg-gray-800 shadow-gray-200"
        : "bg-gray-100 text-black hover:bg-gray-200 shadow-none";

    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled ? "opacity-50" : ""}`}>
            {children}
        </button>
    );
}
