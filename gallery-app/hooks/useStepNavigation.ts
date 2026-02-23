'use client';

import { useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react';

interface UseStepNavigationParams {
    isAssemblyMode: boolean;
    activeTab: 'LDR' | 'GLB';
    canNext: boolean;
    canPrev: boolean;
    setLoading: (v: boolean) => void;
    setStepIdx: Dispatch<SetStateAction<number>>;
    containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Keyboard arrow key handler and Shift+wheel handler for step navigation.
 * Extracted from kids/steps/page.tsx.
 */
export default function useStepNavigation({
    isAssemblyMode,
    activeTab,
    canNext,
    canPrev,
    setLoading,
    setStepIdx,
    containerRef,
}: UseStepNavigationParams) {
    // Keyboard arrow key navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!isAssemblyMode || activeTab !== 'LDR') return;
            if (e.key === 'ArrowRight' && canNext) { setLoading(true); setStepIdx(v => v + 1); }
            else if (e.key === 'ArrowLeft' && canPrev) { setLoading(true); setStepIdx(v => v - 1); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    // Shift+wheel = step navigation, normal wheel = 3D zoom (OrbitControls)
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isAssemblyMode || activeTab !== 'LDR') return;
        const handleWheel = (e: WheelEvent) => {
            if (!e.shiftKey) return; // Shift key not pressed => let zoom handle it
            e.preventDefault();
            if (e.deltaY > 0) { if (canNext) { setLoading(true); setStepIdx(v => v + 1); } }
            else { if (canPrev) { setLoading(true); setStepIdx(v => v - 1); } }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    });
}
