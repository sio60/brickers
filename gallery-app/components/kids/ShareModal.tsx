
import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    loading: boolean;
}

export default function ShareModal({ isOpen, onClose, imageUrl, loading }: ShareModalProps) {
    const { t } = useLanguage();
    const [downloading, setDownloading] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (!imageUrl) return;
        setDownloading(true);
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
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
            setDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!imageUrl) return;
        if (navigator.share) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], "brick-model.png", { type: "image/png" });
                await navigator.share({
                    title: "Check out my Brickers model!",
                    text: "I made this with Brickers AI!",
                    files: [file],
                });
            } catch (e) {
                console.log("Share skipped/failed", e);
            }
        } else {
            // Clipboard fallback
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);
                alert("Image copied to clipboard!");
            } catch (err) {
                console.error(err);
                alert("Share not supported on this device.");
            }
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

                    <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-6 flex items-center justify-center border-2 border-gray-200">
                        {loading ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-bold text-gray-400 animate-pulse">Processing...</span>
                            </div>
                        ) : imageUrl ? (
                            <img src={imageUrl} alt="Generated" className="w-full h-full object-cover animate-scaleIn" />
                        ) : (
                            <div className="text-gray-400 font-bold">Failed to load</div>
                        )}
                    </div>

                    {!loading && imageUrl && (
                        <div className="flex gap-3">
                            <Button onClick={handleDownload} variant="secondary" disabled={downloading}>
                                {downloading ? "Saving..." : (t.kids?.share?.save || "Save")}
                            </Button>
                            <Button onClick={handleShare} variant="primary">
                                {t.kids?.share?.share || "Share"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Button({ children, onClick, variant = "primary", disabled }: any) {
    const base = "flex-1 py-3 px-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
    const styles = variant === "primary"
        ? "bg-black text-white hover:bg-gray-800 shadow-gray-200"
        : "bg-gray-100 text-black hover:bg-gray-200";

    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled ? "opacity-50" : ""}`}>
            {children}
        </button>
    );
}
