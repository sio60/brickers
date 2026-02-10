'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, Center } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

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
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
}: {
    url: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
}) {
    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();

        // URL Modifier logic from original viewer
        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");
            // Normalize accidental double segments
            fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
            fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");
            const lowerFixed = fixed.toLowerCase();
            if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
                const filename = fixed.split("/").pop() || "";
                const lowerName = filename.toLowerCase();
                if (filename && lowerName !== filename) {
                    fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
                }

                const isPrimitive = /^\d+-\d+/.test(filename) ||
                    /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);
                const isSubpart = /^\d+s\d+\.dat$/i.test(filename);

                fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
                fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

                if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
                    fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
                }
                if (isSubpart && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
                    fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
                }
                if (!fixed.includes("/parts/") && !fixed.includes("/p/")) {
                    if (isSubpart) fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
                    else if (isPrimitive) fixed = fixed.replace("/ldraw/", "/ldraw/p/");
                    else fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
                }
            }
            if (fixed.startsWith(CDN_BASE)) {
                return `/api/proxy/ldr?url=${encodeURIComponent(fixed)}`;
            }
            return fixed;
        });

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = true;
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
                await loader.preloadMaterials(ldconfigUrl); // Required for correct colors
                const g = await loader.loadAsync(url);
                console.log("[LDraw] Load successful:", url);
                if (cancelled) {
                    console.log("[LDraw] Load cancelled, disposing:", url);
                    disposeObject3D(g);
                    return;
                }
                g.rotation.x = Math.PI;
                prev = g;
                setGroup(g);
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
    }, [url, loader, onLoaded, onError]);

    if (!group) return null;
    return (
        <Bounds fit clip observe margin={1.2}>
            <Center>
                <primitive object={group} />
            </Center>
        </Bounds>
    );
}

interface Viewer3DProps {
    url: string;
}

export default React.memo(function Viewer3D({ url }: Viewer3DProps) {
    const [loading, setLoading] = useState(true);

    const proxiedUrl = useMemo(() => {
        if (!url) return "";
        if (url.startsWith('http')) {
            // For .ldr files, we try to load directly if it's a known safe domain (like raw.githubusercontent.com)
            // or if we suspect it might have CORS issues, we use the proxy but ensure it's not treated as an image
            if (url.includes('githubusercontent.com')) return url;

            // If it's from our own S3 or other domains, use the proxy
            return `/proxy/image?url=${encodeURIComponent(url)}`;
        }
        return url;
    }, [url]);

    useEffect(() => {
        console.log("[Viewer3D] Raw URL:", url);
        console.log("[Viewer3D] Proxied URL:", proxiedUrl);
    }, [url, proxiedUrl]);

    const handleLoaded = useCallback((group: THREE.Group) => {
        console.log("[LDraw] Model loaded successfully, setting loading to false");
        setLoading(false);
    }, []);

    const handleError = useCallback((e: unknown) => {
        console.error("[LDraw] 3D Viewer Error:", e);
        setLoading(false);
    }, []);

    return (
        <div className="w-full h-full relative bg-gray-50 flex items-center justify-center">
            {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-bold text-gray-600 text-sm">3D 모델 로딩 중...</p>
                </div>
            )}

            <Canvas camera={{ position: [0, 80, 500], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={0.9} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} />
                <directionalLight position={[-10, -20, -10]} intensity={0.8} />
                <LdrModel
                    url={proxiedUrl}
                    onLoaded={handleLoaded}
                    onError={handleError}
                />
                <OrbitControls
                    makeDefault
                    enablePan={false}
                    enableZoom
                    minDistance={10}
                    maxDistance={1000}
                    autoRotate={true}
                    autoRotateSpeed={2}
                />
            </Canvas>

            {/* 터치 안내 문구 제거됨 */}
        </div>
    );
});
