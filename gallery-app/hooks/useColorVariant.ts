'use client';

import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import {
    getColorThemes,
    applyColorVariant,
    downloadLdrFromBase64,
    type ThemeInfo,
} from '@/lib/api/colorVariantApi';
import { type StepBrickInfo } from '@/lib/ldrUtils';

interface UseColorVariantParams {
    ldrUrl: string;
    originalLdrUrl: string;
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    t: any;
    blobRef: MutableRefObject<string[]>;
    sortedBlobRef: MutableRefObject<string | null>;
    onStepBlobsUpdated: (
        blobs: string[],
        sortedBlob: string | null,
        bricks: StepBrickInfo[][],
    ) => void;
    onBoundsUpdated: (bounds: THREE.Box3 | null) => void;
    setLoading: (v: boolean) => void;
    setStepIdx: React.Dispatch<React.SetStateAction<number>>;
}

interface UseColorVariantReturn {
    isColorModalOpen: boolean;
    setIsColorModalOpen: (v: boolean) => void;
    colorThemes: ThemeInfo[];
    selectedTheme: string;
    setSelectedTheme: (v: string) => void;
    isApplyingColor: boolean;
    colorChangedLdrBase64: string | null;
    customThemeInput: string;
    setCustomThemeInput: (v: string) => void;
    colorPreviewUrl: string | null;
    closeColorModal: () => void;
    handleApplyColor: () => Promise<void>;
    restoreOriginalColor: () => Promise<void>;
    downloadColorChangedLdr: () => void;
}

function revokeAll(arr: string[]) {
    arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
}

/**
 * Color variant state and logic extracted from kids/steps/page.tsx.
 * Manages color theme selection, applying color variants, restoring originals,
 * and downloading color-changed LDR files.
 */
export default function useColorVariant({
    ldrUrl,
    originalLdrUrl,
    authFetch,
    t,
    blobRef,
    sortedBlobRef,
    onStepBlobsUpdated,
    onBoundsUpdated,
    setLoading,
    setStepIdx,
}: UseColorVariantParams): UseColorVariantReturn {
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>('');
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);
    const [customThemeInput, setCustomThemeInput] = useState('');
    const [colorPreviewUrl, setColorPreviewUrl] = useState<string | null>(null);

    const closeColorModal = () => {
        setIsColorModalOpen(false);
        if (colorPreviewUrl) {
            URL.revokeObjectURL(colorPreviewUrl);
            setColorPreviewUrl(null);
        }
    };

    // Load themes when modal opens
    useEffect(() => {
        if (isColorModalOpen && colorThemes.length === 0) {
            getColorThemes().then(setColorThemes).catch(e => console.error(e));
        }
    }, [isColorModalOpen, colorThemes.length]);

    const handleApplyColor = async () => {
        if (!selectedTheme || !ldrUrl) return;
        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(ldrUrl, selectedTheme, authFetch);
            if (result.ok && result.ldrData) {
                setColorChangedLdrBase64(result.ldrData);
                const text = atob(result.ldrData);
                // Generate preview URL immediately
                const previewBlob = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
                setColorPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return previewBlob;
                });
                // Regenerate step blobs (using Worker)
                const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
                worker.postMessage({ type: 'PROCESS_LDR', text });
                worker.onmessage = (e) => {
                    if (e.data.type === 'SUCCESS') {
                        const { stepTexts, sortedFullText, stepBricks: bricks } = e.data.payload;
                        const blobs = stepTexts.map((t_blob: string) =>
                            URL.createObjectURL(new Blob([t_blob], { type: 'text/plain' }))
                        );
                        let sortedBlob = null;
                        if (sortedFullText) {
                            sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: 'text/plain' }));
                        }

                        revokeAll(blobRef.current);
                        if (sortedBlobRef.current) URL.revokeObjectURL(sortedBlobRef.current);

                        blobRef.current = blobs;
                        sortedBlobRef.current = sortedBlob;

                        onStepBlobsUpdated(blobs, sortedBlob, bricks || []);
                        setStepIdx(prev => prev < stepTexts.length ? prev : 0);
                    } else {
                        alert(t.kids.steps?.colorChangeModelError);
                    }
                    worker.terminate();
                };
            } else {
                alert(result.message || t.kids.steps.colorThemeFailed);
            }
        } catch (e) {
            console.error(e);
            alert(t.kids.steps.colorThemeError);
        } finally {
            setIsApplyingColor(false);
        }
    };

    const restoreOriginalColor = async () => {
        if (!originalLdrUrl) return;
        setLoading(true);
        try {
            const res = await fetch(originalLdrUrl);
            const text = await res.text();
            // Apply sorting and bounds calculation (using Worker)
            const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
            worker.postMessage({ type: 'PROCESS_LDR', text });
            worker.onmessage = (e) => {
                if (e.data.type === 'SUCCESS') {
                    const { stepTexts, sortedFullText, bounds } = e.data.payload;
                    if (bounds) {
                        onBoundsUpdated(new THREE.Box3(
                            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
                            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
                        ));
                    }
                    const { stepBricks: bricks } = e.data.payload;
                    const blobs = stepTexts.map((t: string) => URL.createObjectURL(new Blob([t], { type: 'text/plain' })));
                    let sortedBlob = null;
                    if (sortedFullText) {
                        sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: 'text/plain' }));
                    }

                    revokeAll(blobRef.current);
                    if (sortedBlobRef.current) URL.revokeObjectURL(sortedBlobRef.current);

                    blobRef.current = blobs;
                    sortedBlobRef.current = sortedBlob;

                    onStepBlobsUpdated(blobs, sortedBlob, bricks || []);
                    setStepIdx(stepTexts.length - 1);
                }
                worker.terminate();
            };
            setColorChangedLdrBase64(null);
            setSelectedTheme('');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const downloadColorChangedLdr = () => {
        if (colorChangedLdrBase64) {
            downloadLdrFromBase64(colorChangedLdrBase64, `brickers_${selectedTheme}.ldr`);
        }
    };

    return {
        isColorModalOpen,
        setIsColorModalOpen,
        colorThemes,
        selectedTheme,
        setSelectedTheme,
        isApplyingColor,
        colorChangedLdrBase64,
        customThemeInput,
        setCustomThemeInput,
        colorPreviewUrl,
        closeColorModal,
        handleApplyColor,
        restoreOriginalColor,
        downloadColorChangedLdr,
    };
}
