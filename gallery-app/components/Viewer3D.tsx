'use client';

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import { preloadPartsBundle } from "@/lib/ldrawBundleLoader";
import LDrawLoadingIndicator from "@/components/LDrawLoadingIndicator";

function disposeObject3D(root: THREE.Object3D) {
    root.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
        else mat?.dispose?.();
    });
}

function LdrModel({
    url,
    bundleSourceUrl,
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
    onProgress,
}: {
    url: string;
    bundleSourceUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    onProgress?: (loaded: number, total: number) => void;
}) {
    const { invalidate, camera, controls } = useThree();
    const onProgressRef = React.useRef(onProgress);
    onProgressRef.current = onProgress;

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier());
        let loadedCount = 0;
        let totalCount = 0;
        manager.onStart = () => { loadedCount = 0; totalCount = 0; };
        manager.onProgress = (_url, loaded, total) => {
            loadedCount = loaded;
            totalCount = total;
            onProgressRef.current?.(loaded, total);
        };

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = false;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }
        return l;
    }, [partsLibraryPath]);

    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        let cancelled = false;
        let prev: THREE.Group | null = null;
        setGroup(null);

        if (!url) return;

        (async () => {
            console.log("[LDraw] Starting load for URL:", url);
            try {
                await preloadPartsBundle(bundleSourceUrl || url);
                await loader.preloadMaterials(ldconfigUrl); // Required for correct colors
                const g = await loader.loadAsync(url);
                console.log("[LDraw] Load successful:", url);
                if (cancelled) {
                    console.log("[LDraw] Load cancelled, disposing:", url);
                    disposeObject3D(g);
                    return;
                }
                g.rotation.x = Math.PI;

                // 모델 중심 정렬 (BrickJudgeViewer 패턴)
                const box = new THREE.Box3().setFromObject(g);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                g.position.set(-center.x, -box.min.y, -center.z);

                // 카메라를 모델 기준으로 배치
                const targetY = size.y / 2;
                if (controls && (controls as any).target) {
                    (controls as any).target.set(0, targetY, 0);
                    (controls as any).update();
                }
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(0, targetY + size.y * 0.3, maxDim * 2.5);
                camera.lookAt(0, targetY, 0);

                prev = g;
                setGroup(g);
                invalidate();
                onLoaded?.(g);
            } catch (e) {
                console.error("[LDraw] Error loading model:", url, e);
                onError?.(e);
            }
        })();

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [url, loader, onLoaded, onError, camera, controls, invalidate]);

    if (!group) return null;
    return <primitive object={group} />;
}

interface Viewer3DProps {
    url: string;
}

export default React.memo(function Viewer3D({ url }: Viewer3DProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState({ loaded: 0, total: 0 });

    const proxiedUrl = useMemo(() => {
        if (!url) return "";
        if (url.startsWith('http')) {
            if (url.includes('githubusercontent.com')) return url;
            return `/proxy/image?url=${encodeURIComponent(url)}`;
        }
        return url;
    }, [url]);

    const handleLoaded = useCallback(() => {
        setLoading(false);
    }, []);

    const handleError = useCallback((e: unknown) => {
        console.error("[LDraw] 3D Viewer Error:", e);
        setLoading(false);
    }, []);

    const handleProgress = useCallback((loaded: number, total: number) => {
        setProgress({ loaded, total });
    }, []);

    return (
        <div className="w-full h-full relative bg-gray-50 flex items-center justify-center">
            {loading && (
                <LDrawLoadingIndicator
                    loaded={progress.loaded}
                    total={progress.total}
                    label={t.viewer3d?.loading || t.common.loading}
                />
            )}

            <Canvas camera={{ position: [0, 80, 500], fov: 45, near: 0.1, far: 100000 }} dpr={[1, 2]} frameloop="demand">
                <ThrottledDriver />
                <ambientLight intensity={0.9} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} />
                <directionalLight position={[-10, -20, -10]} intensity={0.8} />
                <LdrModel
                    url={proxiedUrl}
                    bundleSourceUrl={url}
                    onLoaded={handleLoaded}
                    onError={handleError}
                    onProgress={handleProgress}
                />
                <OrbitControls
                    makeDefault
                    enablePan={false}
                    enableZoom
                    minDistance={10}
                    maxDistance={10000}
                    autoRotate={true}
                    autoRotateSpeed={2}
                />
            </Canvas>
        </div>
    );
});
