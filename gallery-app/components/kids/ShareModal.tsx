
"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import html2canvas from "html2canvas";
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
    const [compositeBlob, setCompositeBlob] = useState<Blob | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<any>(null);

    if (!isOpen) return null;

    const captureComposite = async (): Promise<Blob> => {
        // Create an offscreen canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");

        // Target size (e.g., 1024x1024 for a square result)
        canvas.width = 1000;
        canvas.height = 1000;

        // 1. Draw Background Image
        if (backgroundUrl) {
            const bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.src = backgroundUrl;
            await new Promise((resolve, reject) => {
                bgImg.onload = resolve;
                bgImg.onerror = reject;
            });
            ctx.drawImage(bgImg, 0, 0, 1000, 1000);
        }

        // 2. Draw 3D Model Snapshot
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

    // Pre-generate blob as soon as possible to preserve user gesture context for Share API
    useEffect(() => {
        if (!isOpen || loading || !backgroundUrl || !ldrUrl) {
            setCompositeBlob(null);
            return;
        }

        let alive = true;
        const prepare = async () => {
            setIsPreparing(true);
            try {
                // Give a bit of time for 3D model to render first frame stably
                await new Promise(r => setTimeout(r, 1000));
                if (!alive) return;

                const blob = await captureComposite();
                if (alive) {
                    setCompositeBlob(blob);
                    console.log("[ShareModal] Composite blob ready");
                }
            } catch (e) {
                console.error("[ShareModal] Pre-generation failed:", e);
            } finally {
                if (alive) setIsPreparing(false);
            }
        };
        prepare();
        return () => { alive = false; };
    }, [isOpen, loading, backgroundUrl, ldrUrl]);

    const handleDownload = async () => {
        if (!compositeBlob) return;
        setWorking(true);
        try {
            const blob = compositeBlob;
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
        if (!compositeBlob) return;
        setWorking(true);
        try {
            const blob = compositeBlob;
            const file = new File([blob], "brick-model.png", { type: "image/png" });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Check out my Brickers model!",
                    text: "I made this with Brickers AI!",
                    files: [file],
                });
            } else {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);
                alert("Image copied to clipboard!");
            }
        } catch (e) {
            console.log("Share skipped/failed", e);
            alert("Share failed. Please try again.");
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
                        ref={stageRef}
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
                                <KidsLdrPreview url={ldrUrl} autoRotate={false} ref={previewRef} />
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
                            <Button onClick={handleDownload} variant="secondary" disabled={working || isPreparing || !compositeBlob}>
                                {isPreparing ? "Wait..." : (working ? "Saving..." : (t.kids?.share?.save || "Save"))}
                            </Button>
                            <Button onClick={handleShare} variant="primary" disabled={working || isPreparing || !compositeBlob}>
                                {isPreparing ? "Wait..." : (working ? "Processing..." : (t.kids?.share?.share || "Share"))}
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
