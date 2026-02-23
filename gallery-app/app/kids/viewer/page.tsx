'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import ShareModal from "@/components/kids/ShareModal";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import { patchThreeNullChildren, removeNullChildren, disposeObject3D } from "@/lib/three/threeUtils";

patchThreeNullChildren();

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
    const { invalidate, camera, controls } = useThree();

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier({ useProxy: false }));

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

        (async () => {
            setGroup(null);
            await loader.preloadMaterials(ldconfigUrl);
            const g = await loader.loadAsync(url);
            if (cancelled) { disposeObject3D(g); return; }
            if (g) {
                removeNullChildren(g);
                g.rotation.x = Math.PI;

                // 모델 중심 정렬 (BrickJudgeViewer 패턴)
                const box = new THREE.Box3().setFromObject(g);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                g.position.set(-center.x, -box.min.y, -center.z);

                const targetY = size.y / 2;
                if (controls && (controls as any).target) {
                    (controls as any).target.set(0, targetY, 0);
                    (controls as any).update();
                }
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(0, targetY + size.y * 0.3, maxDim * 2.5);
                camera.lookAt(0, targetY, 0);
            }
            prev = g;
            setGroup(g);
            invalidate();
            onLoaded?.(g);
        })().catch((e) => {
            console.error("[LDraw] load failed:", e);
            onError?.(e);
        });

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError, camera, controls, invalidate]);

    if (!group) return null;
    return <primitive object={group} />;
}



function ViewerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const urlParam = searchParams.get("url") || "";
    const isPreset = searchParams.get("isPreset") === "true";
    const title = searchParams.get("title") || "BRICK Model";
    // Subject for background generation (simple logic: use title or "lego creation")
    const subject = title || "lego creation";

    const [loading, setLoading] = useState(true);
    const modelGroupRef = useRef<THREE.Group | null>(null);

    // Share Modal State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareBackgroundUrl, setShareBackgroundUrl] = useState<string | null>(null);
    const hasGeneratedRef = useRef(false); // Prevent duplicate generation

    const autoGenerateBackground = async () => {
        if (hasGeneratedRef.current) return;
        hasGeneratedRef.current = true;

        setShareModalOpen(true);
        setShareLoading(true);
        setShareBackgroundUrl(null);

        // Wait a bit for the model to render fully
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // 1. Capture Canvas
            const canvas = document.querySelector("canvas");
            if (!canvas) throw new Error("Canvas not found");

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
            if (!blob) throw new Error("Failed to capture canvas");

            // 2. Upload & Generate
            const formData = new FormData();
            formData.append("file", blob, "model.png");

            // Enhance subject with tags if available
            const tagsParam = searchParams.get("tags");
            let finalSubject = subject;
            if (tagsParam) {
                finalSubject += `, ${tagsParam}`;
            }
            formData.append("subject", finalSubject);
            if (urlParam) {
                formData.append("ldrUrl", urlParam);
            }

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
            const endpoint = `${apiBase}/api/kids/share/background`;

            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to generate background");
            }

            const data = await response.json();
            if (data.url) {
                setShareBackgroundUrl(data.url);
            } else {
                throw new Error("No URL in response");
            }
        } catch (e) {
            console.error(e);
            // alert("Failed to create magic background. Try again!");
            // setShareModalOpen(false); 
        } finally {
            setShareLoading(false);
        }
    };

    // Auto-trigger disabled per user request (Only on Main Page)
    // useEffect(() => {
    //     if (!loading && !hasGeneratedRef.current) {
    //         autoGenerateBackground();
    //     }
    // }, [loading]);

    const handleShareClick = async () => {
        setShareModalOpen(true);
        setShareLoading(true);
        setShareBackgroundUrl(null);

        try {
            // 1. Capture Canvas
            const canvas = document.querySelector("canvas");
            if (!canvas) throw new Error("Canvas not found");

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
            if (!blob) throw new Error("Failed to capture canvas");

            // 2. Upload & Generate
            const formData = new FormData();
            formData.append("file", blob, "model.png");
            // Subject for background generation (simple logic: use title or "lego creation")
            formData.append("subject", title || "lego creation");
            if (urlParam) {
                formData.append("ldrUrl", urlParam);
            }

            // Use relative path - Next.js rewrite or direct backend call
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
            const endpoint = `${apiBase}/api/kids/share/background`;

            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to generate background");
            }

            const data = await response.json();
            if (data.url) {
                setShareBackgroundUrl(data.url);
            } else {
                throw new Error("No URL in response");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to create magic background. Try again!");
            setShareModalOpen(false);
        } finally {
            setShareLoading(false);
        }
    };



    if (!urlParam) {
        // ... (no change to error view)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                {/* ... existing error view ... */}
                <div className="text-center">
                    <p className="text-xl font-bold text-gray-800 mb-6">{t.kids?.viewer?.noUrl || "모델 URL이 없습니다"}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto shadow-lg"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5m7-7-7 7 7 7" />
                        </svg>
                        {t.kids?.viewer?.back || "돌아가기"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                backgroundUrl={shareBackgroundUrl}
                ldrUrl={urlParam}
                loading={shareLoading || !shareBackgroundUrl}
            />

            {/* 3D Viewer */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-5xl aspect-[16/10] bg-white rounded-3xl shadow-2xl border-2 border-black overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="font-bold text-gray-600">{t.kids?.viewer?.loading || "3D 모델 로딩 중..."}</p>
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
                        {t.kids?.viewer?.back || "돌아가기"}
                    </button>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-black text-white rounded-full font-bold text-sm shadow-lg">
                        {t.kids?.viewer?.completeModel || "완성된 모델"}
                    </div>



                    <Canvas
                        camera={{ position: [200, -200, 200], fov: 45, near: 0.1, far: 100000 }}
                        dpr={[1, 2]}
                        gl={{ preserveDrawingBuffer: true }}
                        frameloop="demand"
                    >
                        <ThrottledDriver />
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
                        <OrbitControls
                            makeDefault
                            autoRotate={false}
                            enablePan={false}
                            enableZoom={true}
                            enableDamping={true}
                            dampingFactor={0.1}
                            target={[0, 0, 0]}
                        />
                    </Canvas>

                    {/* Instructions overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm text-gray-500 font-medium shadow-md">
                        {t.kids?.viewer?.instructions || "드래그하여 회전 • 스크롤하여 확대/축소"}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-white border-t border-gray-100">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <Link
                        href={`/kids/steps?url=${encodeURIComponent(urlParam)}${isPreset ? '&isPreset=true' : ''}`}
                        className="flex-1 py-4 bg-gray-100 text-black font-bold text-lg rounded-2xl hover:bg-gray-200 transition-all text-center flex items-center justify-center gap-3 shadow-md border-2 border-black"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                            <path d="M9 12h6m-6 4h6" />
                        </svg>
                        {t.kids?.viewer?.viewSteps || "스텝 보기"}
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
