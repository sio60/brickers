'use client';

import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { type StepBrickInfo } from '@/lib/ldrUtils';

interface UseLdrStepsParams {
    ldrUrl: string;
    isAssemblyMode: boolean;
    setLoadingPhase: (phase: 'idle' | 'loading-3d' | 'loaded') => void;
}

interface UseLdrStepsReturn {
    stepBlobUrls: string[];
    setStepBlobUrls: React.Dispatch<React.SetStateAction<string[]>>;
    sortedBlobUrl: string | null;
    setSortedBlobUrl: React.Dispatch<React.SetStateAction<string | null>>;
    stepBricks: StepBrickInfo[][];
    setStepBricks: React.Dispatch<React.SetStateAction<StepBrickInfo[][]>>;
    modelBounds: THREE.Box3 | null;
    setModelBounds: React.Dispatch<React.SetStateAction<THREE.Box3 | null>>;
    loading: boolean;
    setLoading: (v: boolean) => void;
    stepIdx: number;
    setStepIdx: React.Dispatch<React.SetStateAction<number>>;
    blobRef: MutableRefObject<string[]>;
    sortedBlobRef: MutableRefObject<string | null>;
    revokeAll: (arr: string[]) => void;
}

/**
 * LDR parsing and step management hook extracted from kids/steps/page.tsx.
 * Handles fetching LDR, parsing steps via Web Worker, managing blob URLs,
 * and tracking step index and model bounds.
 */
export default function useLdrSteps({
    ldrUrl,
    isAssemblyMode,
    setLoadingPhase,
}: UseLdrStepsParams): UseLdrStepsReturn {
    const [loading, setLoading] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
    const [sortedBlobUrl, setSortedBlobUrl] = useState<string | null>(null);
    const [stepBricks, setStepBricks] = useState<StepBrickInfo[][]>([]);
    const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null);
    const blobRef = useRef<string[]>([]);
    const sortedBlobRef = useRef<string | null>(null);

    const revokeAll = (arr: string[]) => {
        arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
    };

    // LDR parsing and step generation
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!ldrUrl || !isAssemblyMode) return;
            setLoading(true);
            setLoadingPhase('loading-3d');
            setStepIdx(0);
            const res = await fetch(ldrUrl);
            if (!res.ok) throw new Error(`LDR fetch failed: ${res.status}`);
            const text = await res.text();
            // Apply sorting and bounds calculation (using Worker)
            const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
            worker.postMessage({ type: 'PROCESS_LDR', text });
            worker.onmessage = (e) => {
                if (e.data.type === 'SUCCESS' && alive) {
                    const { stepTexts, sortedFullText, bounds, stepBricks: bricks } = e.data.payload;
                    if (bounds) {
                        setModelBounds(new THREE.Box3(
                            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
                            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
                        ));
                    }
                    const blobs = stepTexts.map((t_blob: string) => URL.createObjectURL(new Blob([t_blob], { type: 'text/plain' })));
                    let sortedBlob = null;
                    if (sortedFullText) {
                        sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: 'text/plain' }));
                    }

                    revokeAll(blobRef.current);
                    if (sortedBlobRef.current) URL.revokeObjectURL(sortedBlobRef.current);

                    blobRef.current = blobs;
                    sortedBlobRef.current = sortedBlob;

                    setStepBlobUrls(blobs);
                    setSortedBlobUrl(sortedBlob);
                    setStepBricks(bricks || []);
                    setLoading(false);
                } else if (alive) {
                    setLoading(false);
                }
                worker.terminate();
            };
        })().catch(e => {
            console.error(e);
            setLoading(false);
        });
        return () => { alive = false; };
    }, [ldrUrl, isAssemblyMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            revokeAll(blobRef.current);
            if (sortedBlobRef.current) {
                URL.revokeObjectURL(sortedBlobRef.current);
            }
        };
    }, []);

    return {
        stepBlobUrls,
        setStepBlobUrls,
        sortedBlobUrl,
        setSortedBlobUrl,
        stepBricks,
        setStepBricks,
        modelBounds,
        setModelBounds,
        loading,
        setLoading,
        stepIdx,
        setStepIdx,
        blobRef,
        sortedBlobRef,
        revokeAll,
    };
}
