'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

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
        const mainAbs = (() => {
            try { return new URL(url, typeof window !== 'undefined' ? window.location.href : '').href; }
            catch { return url; }
        })();

        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");

            const isAbsolute = fixed.startsWith("http") || fixed.startsWith("blob:") || fixed.startsWith("/") || fixed.includes(":");

            if (fixed.includes("ldraw-parts-library") && fixed.endsWith(".dat") && !fixed.includes("LDConfig.ldr")) {
                const filename = fixed.split("/").pop() || "";
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
            return fixed;
        });

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = true;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }
        return l;
    }, [partsLibraryPath, url]);

    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        let cancelled = false;
        let prev: THREE.Group | null = null;

        (async () => {
            setGroup(null);
            await loader.preloadMaterials(ldconfigUrl);
            const g = await loader.loadAsync(url);
            if (cancelled) { disposeObject3D(g); return; }
            g.rotation.x = Math.PI;
            prev = g;
            setGroup(g);
            onLoaded?.(g);
        })().catch((e) => {
            console.error("[LDraw] load failed:", e);
            onError?.(e);
        });

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError]);

    if (!group) return null;
    return (
        <Bounds fit clip observe margin={1.2}>
            <primitive object={group} />
        </Bounds>
    );
}

function ViewerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const urlParam = searchParams.get("url") || "";
    const isPreset = searchParams.get("isPreset") === "true";
    const title = searchParams.get("title") || "BRICK Model";

    const [loading, setLoading] = useState(true);
    const modelGroupRef = useRef<THREE.Group | null>(null);

    if (!urlParam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">모델 URL이 없습니다</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-black text-white rounded-full font-bold"
                    >
                        ← 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">


            {/* 3D Viewer */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-5xl aspect-[16/10] bg-white rounded-3xl shadow-2xl border-2 border-black overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="font-bold text-gray-600">3D 모델 로딩 중...</p>
                        </div>
                    )}

                    {/* Back Button inside Container */}
                    <button
                        onClick={() => router.back()}
                        className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md text-black font-bold text-sm shadow-md hover:bg-white transition-all ring-1 ring-gray-100"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5m7-7-7 7 7 7" />
                        </svg>
                        돌아가기
                    </button>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-black text-white rounded-full font-bold text-sm shadow-lg">
                        완성된 모델
                    </div>

                    <Canvas camera={{ position: [200, -200, 200], fov: 45 }} dpr={[1, 2]}>
                        <ambientLight intensity={0.9} />
                        <directionalLight position={[3, 5, 2]} intensity={1} />
                        <LdrModel
                            url={urlParam}
                            onLoaded={(g) => {
                                setLoading(false);
                                modelGroupRef.current = g;
                            }}
                            onError={() => setLoading(false)}
                        />
                        <OrbitControls makeDefault enablePan={false} enableZoom />
                    </Canvas>

                    {/* Instructions overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm text-gray-500 font-medium shadow-md">
                        드래그하여 회전 • 스크롤하여 확대/축소
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-white border-t border-gray-100">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <Link
                        href={`/kids/steps?url=${encodeURIComponent(urlParam)}${isPreset ? '&isPreset=true' : ''}`}
                        className="flex-1 py-4 bg-black text-white font-bold text-lg rounded-2xl hover:bg-gray-800 transition-all text-center flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                            <path d="M9 12h6m-6 4h6" />
                        </svg>
                        스텝 보기
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ViewerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ViewerContent />
        </Suspense>
    );
}
