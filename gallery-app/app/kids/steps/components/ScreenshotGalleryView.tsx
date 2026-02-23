'use client';

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import LdrModel from "./LdrModel";
import { type ViewName, VIEW_ORDER } from "./OffscreenRenderer";
import styles from '../KidsStepPage.module.css';

interface ScreenshotGalleryViewProps {
    t: any;
    showFull3D: boolean;
    setShowFull3D: (v: boolean) => void;
    jobLoaded: boolean;
    jobScreenshotUrls: Record<string, string> | null;
    selectedView: ViewName;
    setSelectedView: (v: ViewName) => void;
    perfProfile: any;
    ldrUrl: string;
    sortedBlobUrl: string | null;
    modelBounds: THREE.Box3 | null;
    setLoading: (v: boolean) => void;
    setIsAssemblyMode: (v: boolean) => void;
}

export default function ScreenshotGalleryView({
    t,
    showFull3D,
    setShowFull3D,
    jobLoaded,
    jobScreenshotUrls,
    selectedView,
    setSelectedView,
    perfProfile,
    ldrUrl,
    sortedBlobUrl,
    modelBounds,
    setLoading,
    setIsAssemblyMode,
}: ScreenshotGalleryViewProps) {
    return (
        <div className={`${styles.kidsStep__splitPane} ${styles.left} ${styles.full}`} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                {/* 메인 이미지 */}
                <div style={{ flex: 1, position: 'relative', background: '#fff', minHeight: 0 }}>
                    {(showFull3D || (jobLoaded && !jobScreenshotUrls?.[selectedView])) ? (
                        <div style={{ position: 'absolute', inset: 0 }}>
                            <Canvas
                                camera={{ position: [200, -200, 200], fov: 45, near: 0.1, far: 100000 }}
                                dpr={perfProfile?.dpr ?? [1, 2]}
                                gl={{ preserveDrawingBuffer: true }}
                                frameloop="demand"
                            >
                                <ThrottledDriver />
                                <ambientLight intensity={0.9} />
                                <directionalLight position={[3, 5, 2]} intensity={1} />
                                {ldrUrl && (
                                    <LdrModel
                                        url={sortedBlobUrl || ldrUrl}
                                        stepMode={false}
                                        smoothNormals={perfProfile?.smoothNormals ?? false}
                                        onLoaded={(g) => { setLoading(false); }}
                                        onError={() => setLoading(false)}
                                        customBounds={modelBounds}
                                    />
                                )}
                                <OrbitControls makeDefault enablePan={false} enableZoom />
                            </Canvas>
                            {jobScreenshotUrls?.[selectedView] && (
                                <button
                                    onClick={() => setShowFull3D(false)}
                                    style={{
                                        position: 'absolute', top: 16, right: 16,
                                        padding: '8px 16px', background: '#fff', borderRadius: 20,
                                        border: '1px solid #ddd', fontSize: '0.8rem', fontWeight: 'bold',
                                        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    이미지 보기
                                </button>
                            )}
                        </div>
                    ) : jobScreenshotUrls?.[selectedView] ? (
                        <img
                            src={jobScreenshotUrls[selectedView]}
                            alt={selectedView}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                            {jobLoaded ? 'No Screenshot' : 'Loading...'}
                        </div>
                    )}
                </div>
                {/* 썸네일 + 조립서 보기 버튼 */}
                <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                        {VIEW_ORDER.map(view => (
                            jobScreenshotUrls?.[view] ? (
                                <button
                                    key={view}
                                    onClick={() => { setSelectedView(view); setShowFull3D(false); }}
                                    style={{
                                        width: 56, height: 56, position: 'relative',
                                        border: (selectedView === view && !showFull3D) ? '2px solid #000' : '2px solid #e5e7eb',
                                        borderRadius: 8, overflow: 'hidden', padding: 0,
                                        cursor: 'pointer', background: '#fff',
                                        opacity: (selectedView === view && !showFull3D) ? 1 : 0.7,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <img
                                        src={jobScreenshotUrls[view]}
                                        alt={view}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </button>
                            ) : null
                        ))}
                    </div>
                    <button
                        onClick={() => setIsAssemblyMode(true)}
                        style={{
                            width: '100%', padding: '12px 0',
                            background: '#000', color: '#fff',
                            borderRadius: 16, fontWeight: 700,
                            fontSize: '1rem', border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {t.kids.steps?.viewAssembly || "\uC870\uB9BD\uC11C \uBCF4\uAE30"}
                    </button>
                </div>
            </div>
        </div>
    );
}
