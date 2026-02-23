'use client';

import React from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { FpsMonitor } from "./OffscreenRenderer";
import LdrModel from "./LdrModel";
import * as gtag from "@/lib/gtag";
import styles from '../KidsStepPage.module.css';

interface AssemblyStepViewProps {
    t: any;
    perfProfile: any;
    ldrUrl: string;
    sortedBlobUrl: string | null;
    stepIdx: number;
    setStepIdx: React.Dispatch<React.SetStateAction<number>>;
    total: number;
    canPrev: boolean;
    canNext: boolean;
    loading: boolean;
    setLoading: (v: boolean) => void;
    setLoadingPhase: (phase: 'idle' | 'loading-3d' | 'loaded') => void;
    modelBounds: THREE.Box3 | null;
    modelGroupRef: React.MutableRefObject<THREE.Group | null>;
    setIsAssemblyMode: (v: boolean) => void;
    jobId: string;
}

export default function AssemblyStepView({
    t,
    perfProfile,
    ldrUrl,
    sortedBlobUrl,
    stepIdx,
    setStepIdx,
    total,
    canPrev,
    canNext,
    loading,
    setLoading,
    setLoadingPhase,
    modelBounds,
    modelGroupRef,
    setIsAssemblyMode,
    jobId,
}: AssemblyStepViewProps) {
    return (
        <div className={`${styles.kidsStep__splitPane} ${styles.full}`}>
            <div className={styles.kidsStep__paneLabel}>조립 순서</div>
            <button
                className={styles.kidsStep__viewFullBtn}
                onClick={() => {
                    setLoading(true);
                    setTimeout(() => {
                        setIsAssemblyMode(false);
                        setLoading(false);
                    }, 100);
                }}
            >
                전체 3D 보기
            </button>
            <Canvas
                camera={{ position: [200, -200, 200], fov: 45, near: 0.1, far: 100000 }}
                dpr={perfProfile?.dpr ?? [1, 2]}
                gl={{ preserveDrawingBuffer: true }}
                frameloop="demand"
            >
                <ThrottledDriver />
                <FpsMonitor />
                <ambientLight intensity={0.9} />
                <directionalLight position={[3, 5, 2]} intensity={1} />
                {ldrUrl && (
                    <LdrModel
                        url={sortedBlobUrl || ldrUrl}
                        currentStep={stepIdx + 1}
                        stepMode={true}
                        smoothNormals={perfProfile?.smoothNormals ?? false}

                        onLoaded={(g) => { modelGroupRef.current = g; setLoading(false); setLoadingPhase('loaded'); }}
                        onError={() => setLoading(false)}
                        customBounds={modelBounds}
                        fitTrigger={`${ldrUrl}|${stepIdx}|right`}
                    />
                )}
                <OrbitControls makeDefault enablePan={false} enableZoom />
            </Canvas>

            <div className={styles.kidsStep__placeholder} />


            <div className={styles.kidsStep__navOverlay}>
                <button className={styles.kidsStep__navBtn} disabled={!canPrev} onClick={() => { setLoading(true); setStepIdx(v => v - 1); }}>
                    ← {t.kids.steps.prev}
                </button>
                <div className={styles.kidsStep__stepInfo}>
                    Step {stepIdx + 1} <span style={{ color: "#aaa" }}>/ {total}</span>
                </div>
                {canNext && (
                    <button className={`${styles.kidsStep__navBtn} ${styles['kidsStep__navBtn--next']}`} onClick={() => {
                        setLoading(true);
                        setStepIdx(v => {
                            const next = v + 1;
                            // [NEW] 트래킹: 다음 스텝 이동
                            gtag.trackGameAction("game_exit", { // exit을 '단계 진행' 용도로 활용 가능하나, 여기서는 단순 액션으로 기록
                                action: "step_next",
                                current_step: next,
                                job_id: jobId || undefined
                            });
                            return next;
                        });
                    }}>
                        {t.kids.steps.next} →
                    </button>
                )}
            </div>
            <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#aaa", marginTop: 4 }}>
                Shift + Scroll / ← → {t.kids.steps?.stepNavHint || '키로 단계 이동'}
            </div>
        </div>
    );
}
