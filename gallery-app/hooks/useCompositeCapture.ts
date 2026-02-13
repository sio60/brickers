'use client';

import { RefObject } from 'react';
import { KidsLdrPreviewHandle } from '@/components/kids/KidsLdrPreview';

interface CaptureParams {
    shareBackgroundUrl: string | null;
    previewRef: RefObject<KidsLdrPreviewHandle | null>;
    jobId: string | null;
}

export function useCompositeCapture({ shareBackgroundUrl, previewRef, jobId }: CaptureParams) {

    const captureComposite = async (): Promise<Blob> => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");

        canvas.width = 1000;
        canvas.height = 1000;

        // 1. Draw Background
        if (shareBackgroundUrl) {
            const proxyUrl = `/proxy/image?url=${encodeURIComponent(shareBackgroundUrl)}`;
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

        // 2. Draw 3D Model
        if (previewRef.current) {
            const dataUrl = previewRef.current.captureScreenshot();
            if (dataUrl) {
                const modelImg = new Image();
                modelImg.src = dataUrl;
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

    const handleSaveImage = async (onProcessingStateChange?: (loading: boolean) => void) => {
        onProcessingStateChange?.(true);
        try {
            const blob = await captureComposite();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `brickers-${jobId || 'model'}.png`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Save image failed:", e);
        } finally {
            onProcessingStateChange?.(false);
        }
    };

    return {
        captureComposite,
        handleSaveImage
    };
}
