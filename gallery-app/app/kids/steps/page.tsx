'use client';

import { useState, useEffect, useRef, useMemo, Suspense, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls, Center, Gltf, Environment, useBounds } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { registerToGallery } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, downloadLdrFromBase64, type ThemeInfo } from "@/lib/api/colorVariantApi";
import { type StepBrickInfo } from "@/lib/ldrUtils";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import BackgroundBricks from "@/components/BackgroundBricks";
import { generatePdfFromServer } from "@/components/kids/PDFGenerator";
import ShareModal from "@/components/kids/ShareModal";
import './KidsStepPage.css';

/* ── Monkey-patch: null children을 원천 차단 ── */
const _origAdd = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...objects: THREE.Object3D[]) {
    return _origAdd.apply(this, objects.filter(o => o != null));
};

function removeNullChildren(obj: THREE.Object3D) {
    if (!obj) return;
    if (obj.children) {
        obj.children = obj.children.filter(c => c !== null && c !== undefined);
        obj.children.forEach(c => removeNullChildren(c));
    }
}

function disposeObject3D(root: THREE.Object3D) {
    if (!root) return;
    removeNullChildren(root);
    root.traverse((obj: any) => {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
        else mat?.dispose?.();
    });
}

function buildCumulativeStepTexts(ldrText: string): string[] {
    const lines = ldrText.replace(/\r\n/g, "\n").split("\n");
    const segments: string[][] = [];
    let cur: string[] = [];
    let hasStep = false;

    for (const raw of lines) {
        const line = raw.trim();
        if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
            hasStep = true;
            segments.push(cur);
            cur = [];
            continue;
        }
        cur.push(raw);
    }
    segments.push(cur);
    if (!hasStep) return [ldrText];

    const out: string[] = [];
    let acc: string[] = [];
    for (const seg of segments) {
        acc = acc.concat(seg);
        out.push(acc.join("\n"));
    }
    return out;
}

// 모달용 어댑터 (기존 코드 호환성)
function GalleryRegisterInputModalAdapter({ t, onRegister, isSubmitting, onClose }: any) {
    const [title, setTitle] = useState("");
    return (
        <>
            <input type="text" className="galleryModal__input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.kids.steps.galleryModal.placeholder} autoFocus />
            <div className="galleryModal__actions">
                <button className="galleryModal__btn galleryModal__btn--cancel" onClick={onClose}>{t.kids.steps.galleryModal.cancel}</button>
                <button className="galleryModal__btn galleryModal__btn--confirm" onClick={() => onRegister(title)} disabled={isSubmitting}>{isSubmitting ? "..." : t.kids.steps.galleryModal.confirm}</button>
            </div>
        </>
    );
}

function LdrModel({
    url,
    overrideMainLdrUrl,
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
    customBounds,
    fitTrigger,
    noFit,
    currentStep,
    stepMode = false,
    fitMargin = 1.5,
}: {
    url: string;
    overrideMainLdrUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    customBounds?: THREE.Box3 | null;
    fitTrigger?: string;
    noFit?: boolean;
    currentStep?: number;
    stepMode?: boolean;
    fitMargin?: number;
}) {
    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier({
            mainModelUrl: url,
            overrideMainLdrUrl,
            useProxy: false,
        }));

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = true;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }
        return l;
    }, [partsLibraryPath, url, overrideMainLdrUrl]);

    const [group, setGroup] = useState<THREE.Group | null>(null);
    const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());

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

                // Clone materials for restoration
                g.traverse((child: any) => {
                    if (child.isMesh) {
                        originalMaterialsRef.current.set(child.uuid, Array.isArray(child.material) ? child.material.slice() : child.material);
                    }
                });
            }
            prev = g;
            setGroup(g);
            if (g) onLoaded?.(g);
        })().catch((e) => {
            console.error("[LDraw] load failed:", e);
            onError?.(e);
        });
        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
            originalMaterialsRef.current.clear();
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError]);

    // Step Mode Logic: Group by startingBuildingStep & apply transparency
    useLayoutEffect(() => {
        if (!group) return;

        // If not in stepMode, ensure full visibility
        if (!stepMode || currentStep === undefined) {
            group.traverse((child: any) => {
                if (child.isMesh) {
                    child.visible = true;
                    if (originalMaterialsRef.current.has(child.uuid)) {
                        (child as any).material = originalMaterialsRef.current.get(child.uuid);
                    }
                }
            });
            // Also ensure group children are visible
            group.children.forEach(child => { child.visible = true; });
            return;
        }

        // Group children by startingBuildingStep
        const stepGroups: THREE.Object3D[][] = [[]];
        group.children.forEach((child) => {
            if ((child as any).userData?.startingBuildingStep && stepGroups[stepGroups.length - 1].length > 0) {
                stepGroups.push([]);
            }
            stepGroups[stepGroups.length - 1].push(child);
        });

        const currentStepIndex = currentStep - 1; // 1-based to 0-based
        const activeStepsCount = stepGroups.length;

        // Identify children in current step vs previous steps
        const currentStepChildren = new Set<THREE.Object3D>(stepGroups[currentStepIndex] || []);
        const previousStepChildren = new Set<THREE.Object3D>();
        for (let i = 0; i < currentStepIndex; i++) {
            (stepGroups[i] || []).forEach(c => previousStepChildren.add(c));
        }

        group.traverse((child) => {
            // Find root child (direct descendant of group)
            let rootChild = child;
            while (rootChild.parent && rootChild.parent !== group) {
                rootChild = rootChild.parent;
            }

            if (rootChild.parent !== group) return; // Should not happen

            // Determine visibility
            const isCurrent = currentStepChildren.has(rootChild);
            const isPrevious = previousStepChildren.has(rootChild);

            if (isCurrent) {
                child.visible = true;
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                child.visible = true;
                // Make transparent
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const mat = Array.isArray(originalMat) ? originalMat[0].clone() : (originalMat as THREE.Material).clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            } else {
                // Future step
                // Hide purely
                child.visible = false;
                // If deep child, we might need to recursively hide, but traversing handles it if we hide rootChild?
                // The loop iterates ALL descendants.
                // If rootChild is hidden, descendants are hidden.
                // But we are setting .visible on descendants?
                // Wait, traverse hits everything.
                // If I set rootChild.visible = false, do I need to set children?
                // Three.js respects hierarchy.
            }
        });

        // Optimization: just set visibility on group.children (top level)
        group.children.forEach(child => {
            const isCurrent = currentStepChildren.has(child);
            const isPrevious = previousStepChildren.has(child);
            child.visible = isCurrent || isPrevious;
        });

        // Apply materials only to visible meshes
        group.traverse((child) => {
            if (!child.visible) return;
            // Check if it belongs to current or previous
            let root = child;
            while (root.parent && root.parent !== group) root = root.parent;

            const isCurrent = currentStepChildren.has(root);
            const isPrevious = previousStepChildren.has(root);

            if (isCurrent) {
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const baseMat = Array.isArray(originalMat) ? originalMat[0] : originalMat;
                        const mat = baseMat.clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            }
        });

    }, [group, currentStep, stepMode]);

    if (!group) return null;

    let boundMesh = null;
    if (customBounds) {
        const size = new THREE.Vector3();
        customBounds.getSize(size);
        const center = new THREE.Vector3();
        customBounds.getCenter(center);
        boundMesh = (
            <mesh position={[center.x, -center.y, center.z]}>
                <boxGeometry args={[size.x, size.y, size.z]} />
                <meshBasicMaterial transparent opacity={0} wireframe />
            </mesh>
        );
    }

    return (
        <Bounds fit={!noFit} clip margin={fitMargin}>
            <Center>
                <primitive object={group} />
                {boundMesh}
            </Center>
            {!noFit && <FitOnceOnLoad trigger={fitTrigger ?? ""} />}
        </Bounds>
    );
}

function FitOnceOnLoad({ trigger }: { trigger: string }) {
    const bounds = useBounds();
    useEffect(() => {
        bounds?.refresh().fit();
    }, [bounds, trigger]);
    return null;
}

// parseAndProcessSteps moved to @/lib/ldrUtils

interface GalleryRegisterInputProps {
    t: any;
    isRegisteredToGallery: boolean;
    isSubmitting: boolean;
    onRegister: (title: string) => void;
}

function GalleryRegisterInput({ t, isRegisteredToGallery, isSubmitting, onRegister }: GalleryRegisterInputProps) {
    const [title, setTitle] = useState("");

    const handleClick = () => {
        onRegister(title);
    };

    // 등록 완료되면 타이틀 초기화? or 유지? 기획상 유지하는게 나을듯 하지만
    // isRegisteredToGallery가 true가 되면 input 비활성화됨. 

    return (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
            <div style={{ marginBottom: 8, paddingLeft: 2, fontSize: "0.65rem", color: "#999", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                {t.kids.steps.registerGallery}
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                <input
                    type="text" className="kidsStep__sidebarInput"
                    placeholder={t.kids.steps.galleryModal.placeholder}
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    disabled={isRegisteredToGallery}
                />
                <button
                    className="kidsStep__sidebarBtn" onClick={handleClick}
                    disabled={isSubmitting || isRegisteredToGallery}
                >
                    {isRegisteredToGallery ? `✓ ${t.kids.steps?.registered || '등록완료'}` : (isSubmitting ? "..." : t.kids.steps.registerGallery)}
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// Offscreen Brick Renderer Strategy
// =============================================================================
// WebGL Context limit issue (max 8~16) prevents rendering many small Canvases.
// Solution: Use ONE offscreen Canvas to render bricks sequentially and capture image.

type RenderRequest = {
    partName: string;
    color: string;
    resolve: (url: string) => void;
};

// Global Render Queue
const renderQueue: RenderRequest[] = [];
let isRendering = false;
let processQueueInternal: (() => void) | null = null;

function processQueue() {
    if (isRendering || renderQueue.length === 0 || !processQueueInternal) return;
    isRendering = true;
    processQueueInternal();
}

function requestBrickImage(partName: string, color: string): Promise<string> {
    return new Promise((resolve) => {
        // Check cache (SessionStorage or Memory)
        const cacheKey = `brick_thumb_${partName}_${color}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            resolve(cached);
            return;
        }

        renderQueue.push({ partName, color, resolve });
        processQueue();
    });
}

function OffscreenBrickRenderer() {
    const [currentReq, setCurrentReq] = useState<RenderRequest | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const { gl, scene, camera } = useThree();
    const frameCountRef = useRef(0);
    const initialDelayRef = useRef(true);

    useEffect(() => {
        // Delay thumbnail generation by 2s to let main model load first
        const timer = setTimeout(() => {
            initialDelayRef.current = false;
            processQueueInternal = () => {
                const req = renderQueue.shift();
                if (req) {
                    const ldr = `1 ${req.color} 0 0 0 1 0 0 0 1 0 0 0 1 ${req.partName}.dat`;
                    const blob = new Blob([ldr], { type: 'text/plain' });
                    const objUrl = URL.createObjectURL(blob);
                    setCurrentReq(req);
                    setUrl(objUrl);
                } else {
                    isRendering = false;
                }
            };
            processQueue();
        }, 2000);
        return () => {
            clearTimeout(timer);
            processQueueInternal = null;
        };
    }, []);

    // When model loaded & rendered -> Capture
    const onLoaded = () => {
        // Wait a small tick for render
        setTimeout(async () => {
            if (!currentReq) return;

            // Yield to main thread every 3 renders to keep UI responsive
            frameCountRef.current++;
            if (frameCountRef.current % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Fit camera to brick bounding box for consistent sizing
            const box = new THREE.Box3().setFromObject(scene);
            if (!box.isEmpty()) {
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                box.getCenter(center);
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                const dist = (maxDim / (2 * Math.tan(fov / 2))) * 1.9; // Balanced: between 1.7 (too big) and 2.1 (too small)
                const k = 0.577; // 1/sqrt(3)
                camera.position.set(center.x + dist * k, center.y + dist * k, center.z + dist * k);
                camera.lookAt(center);
                camera.updateProjectionMatrix();
            }

            gl.render(scene, camera);
            const dataUrl = gl.domElement.toDataURL("image/png");

            // Cache & Resolve
            const cacheKey = `brick_thumb_${currentReq.partName}_${currentReq.color}`;
            try { sessionStorage.setItem(cacheKey, dataUrl); } catch { }
            currentReq.resolve(dataUrl);

            // Cleanup
            if (url) URL.revokeObjectURL(url);
            setUrl(null);
            setCurrentReq(null);

            // Next
            isRendering = false;
            processQueue();
        }, 50);
    };

    if (!url) return null;

    return (
        <Center>
            <LdrModel
                url={url}
                fitTrigger={url}
                fitMargin={1.6}
                onLoaded={onLoaded}
                onError={() => {
                    // Skip error
                    if (currentReq) currentReq.resolve(""); // Empty on error
                    isRendering = false;
                    processQueue();
                }}
            />
        </Center>
    );
}

// Global Renderer Component (Mounted once in page)
function OffscreenRenderer() {
    return (
        <div style={{ position: "absolute", top: -9999, left: -9999, width: 64, height: 64, visibility: "visible" }}>
            <Canvas
                gl={{ preserveDrawingBuffer: true, alpha: true }}
                camera={{ position: [100, 100, 100], fov: 35 }}
                dpr={1}
                frameloop="demand"
            >
                <ambientLight intensity={1.5} />
                <directionalLight position={[5, 10, 5]} intensity={2} />
                <OffscreenBrickRenderer />
            </Canvas>
        </div>
    );
}

function BrickThumbnail({ partName, color }: { partName: string, color: string }) {
    const [imgUrl, setImgUrl] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        requestBrickImage(partName, color).then(url => {
            if (alive) setImgUrl(url);
        });
        return () => { alive = false; };
    }, [partName, color]);

    if (!imgUrl) {
        // Loading state
        return (
            <div className="kidsStep__brickColorBlock" style={{ background: "#eee", width: 60, height: 60, borderRadius: 6 }} />
        );
    }

    return (
        <div className="kidsStep__brickColorBlock" style={{
            width: 60, height: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fff", borderRadius: 6, border: "1px solid #eee"
        }}>
            <img src={imgUrl} alt={partName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    );
}

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const jobId = searchParams.get("jobId") || "";
    const urlParam = searchParams.get("url") || "";
    const [serverPdfUrl, setServerPdfUrl] = useState<string>(searchParams.get("pdfUrl") || "");

    const [ldrUrl, setLdrUrl] = useState<string>(urlParam);
    const [originalLdrUrl] = useState<string>(urlParam);
    const [loading, setLoading] = useState(true);
    const [stepIdx, setStepIdx] = useState(0);
    const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
    const [sortedBlobUrl, setSortedBlobUrl] = useState<string | null>(null); // [NEW] 전체 정렬된 LDR Blob
    const [stepBricks, setStepBricks] = useState<StepBrickInfo[][]>([]);
    const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null);
    const blobRef = useRef<string[]>([]);
    const sortedBlobRef = useRef<string | null>(null);
    const modelGroupRef = useRef<THREE.Group | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    // const [galleryTitle, setGalleryTitle] = useState(""); // -> Moved to child component
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [isRegisteredToGallery, setIsRegisteredToGallery] = useState(false);
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [brickCount, setBrickCount] = useState<number>(0);
    const [isProMode, setIsProMode] = useState(false);
    const [jobScreenshotUrls, setJobScreenshotUrls] = useState<Record<string, string> | null>(null);


    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB'>('LDR');
    const [isAssemblyMode, setIsAssemblyMode] = useState(false);
    const [glbUrl, setGlbUrl] = useState<string | null>(null);

    // Color Variant State
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

    // 공유하기 관련
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareBackgroundUrl, setShareBackgroundUrl] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const revokeAll = (arr: string[]) => {
        arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
    };

    // 테마 로드
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
                // step blob들 재생성 (Worker 사용)
                const text = atob(result.ldrData);
                const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
                worker.postMessage({ type: 'PROCESS_LDR', text });
                worker.onmessage = (e) => {
                    if (e.data.type === 'SUCCESS') {
                        const { stepTexts, sortedFullText, stepBricks: bricks } = e.data.payload;
                        const blobs = stepTexts.map((t_blob: string) =>
                            URL.createObjectURL(new Blob([t_blob], { type: "text/plain" }))
                        );
                        let sortedBlob = null;
                        if (sortedFullText) {
                            sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: "text/plain" }));
                        }

                        revokeAll(blobRef.current);
                        if (sortedBlobRef.current) URL.revokeObjectURL(sortedBlobRef.current);

                        blobRef.current = blobs;
                        sortedBlobRef.current = sortedBlob;

                        setStepBlobUrls(blobs);
                        setSortedBlobUrl(sortedBlob);
                        setStepBricks(bricks || []);
                        setStepIdx(prev => prev < stepTexts.length ? prev : 0);
                        setIsColorModalOpen(false);
                        alert(`${result.themeApplied} ${t.kids.steps.colorThemeApplied}`);
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
            // 정렬 및 Bounds 계산 적용 (Worker 사용)
            const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
            worker.postMessage({ type: 'PROCESS_LDR', text });
            worker.onmessage = (e) => {
                if (e.data.type === 'SUCCESS') {
                    const { stepTexts, sortedFullText, bounds } = e.data.payload;
                    if (bounds) {
                        setModelBounds(new THREE.Box3(
                            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
                            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
                        ));
                    }
                    const { stepBricks: bricks } = e.data.payload;
                    const blobs = stepTexts.map((t: string) => URL.createObjectURL(new Blob([t], { type: "text/plain" })));
                    let sortedBlob = null;
                    if (sortedFullText) {
                        sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: "text/plain" }));
                    }

                    revokeAll(blobRef.current);
                    if (sortedBlobRef.current) URL.revokeObjectURL(sortedBlobRef.current);

                    blobRef.current = blobs;
                    sortedBlobRef.current = sortedBlob;

                    setStepBlobUrls(blobs);
                    setSortedBlobUrl(sortedBlob);
                    setStepBricks(bricks || []);
                    setStepIdx(stepTexts.length - 1);
                }
                worker.terminate();
            };
            setColorChangedLdrBase64(null);
            setSelectedTheme("");
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

    const downloadLdr = async () => {
        if (!ldrUrl) return;
        try {
            const res = await fetch(ldrUrl);
            const blob = await res.blob();
            const dUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dUrl;
            link.download = `brickers_${jobId || 'model'}.ldr`;
            link.click();
            URL.revokeObjectURL(dUrl);
        } catch (err) { console.error(err); }
    };

    const downloadGlb = () => {
        if (!glbUrl) return;
        const link = document.createElement("a");
        link.href = glbUrl;
        link.download = `brickers_${jobId || 'model'}.glb`;
        link.click();
    };

    // Job 정보 로드
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!jobId) return;
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
                const res = await fetch(`${API_BASE}/api/kids/jobs/${jobId}`, { credentials: 'include' });
                if (!res.ok) throw new Error(`job fetch failed: ${res.status}`);
                const data = await res.json();
                if (alive) {
                    if (!ldrUrl) setLdrUrl(data.ldrUrl || data.ldr_url || "");
                    setJobThumbnailUrl(data.sourceImageUrl || null);
                    setGlbUrl(data.glbUrl || data.glb_url || null);
                    if (data.suggestedTags && Array.isArray(data.suggestedTags)) setSuggestedTags(data.suggestedTags);
                    if (data.parts) setBrickCount(data.parts);
                    if (data.isPro) setIsProMode(true);
                    if (data.pdfUrl || data.pdf_url) setServerPdfUrl(data.pdfUrl || data.pdf_url);
                    if (data.screenshotUrls) setJobScreenshotUrls(data.screenshotUrls);
                    if (data.backgroundUrl) setShareBackgroundUrl(data.backgroundUrl);
                }
            } catch (e) { console.error(e); }
        })();
        return () => { alive = false; };
    }, [jobId, ldrUrl]);

    // LDR 파싱 및 Steps 생성
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!ldrUrl) return;
            setLoading(true);
            setStepIdx(0);
            const res = await fetch(ldrUrl);
            if (!res.ok) throw new Error(`LDR fetch failed: ${res.status}`);
            const text = await res.text();
            // 정렬 및 Bounds 계산 적용 (Worker 사용)
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
                    const blobs = stepTexts.map((t_blob: string) => URL.createObjectURL(new Blob([t_blob], { type: "text/plain" })));
                    let sortedBlob = null;
                    if (sortedFullText) {
                        sortedBlob = URL.createObjectURL(new Blob([sortedFullText], { type: "text/plain" }));
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
    }, [ldrUrl]);

    useEffect(() => {
        return () => {
            revokeAll(blobRef.current);
            if (sortedBlobRef.current) {
                URL.revokeObjectURL(sortedBlobRef.current);
            }
        };
    }, []);

    const handleDownloadPdf = () => {
        if (serverPdfUrl) {
            window.open(serverPdfUrl, "_blank");
        } else {
            alert(t.kids.steps?.pdfWait);
        }
    };

    const handleRegisterGallery = async (inputTitle: string) => {
        if (!inputTitle.trim()) return alert(t.kids.steps.galleryModal.placeholder);
        setIsSubmitting(true);
        try {
            await registerToGallery({
                jobId: jobId || undefined,
                title: inputTitle,
                content: t.kids.steps.galleryModal.content,
                tags: suggestedTags.length > 0 ? suggestedTags : ["Kids", "Brick"],
                thumbnailUrl: jobThumbnailUrl || undefined,
                ldrUrl: ldrUrl || undefined,
                sourceImageUrl: jobThumbnailUrl || undefined,
                glbUrl: glbUrl || undefined,
                parts: brickCount || undefined,
                screenshotUrls: jobScreenshotUrls || undefined,
                visibility: "PUBLIC",
            });
            alert(t.kids.steps.galleryModal.success);
            setIsGalleryModalOpen(false);
            // setGalleryTitle(""); // Parent doesn't hold title anymore
            setIsRegisteredToGallery(true);
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes("이미 갤러리에 등록")) {
                alert(err.message);
                setIsRegisteredToGallery(true);
            } else {
                alert(t.kids.steps.galleryModal.fail);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = stepBlobUrls.length || 1;
    const canPrev = stepIdx > 0;
    const canNext = stepIdx < total - 1;

    const isPreset = searchParams.get("isPreset") === "true";

    // 키보드 화살표 + 마우스 휠
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!isAssemblyMode || activeTab !== 'LDR') return;
            if (e.key === 'ArrowRight' && canNext) { setLoading(true); setStepIdx(v => v + 1); }
            else if (e.key === 'ArrowLeft' && canPrev) { setLoading(true); setStepIdx(v => v - 1); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    // Shift+휠 = 스텝 전환, 일반 휠 = 3D 줌 (OrbitControls)
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isAssemblyMode || activeTab !== 'LDR') return;
        const handleWheel = (e: WheelEvent) => {
            if (!e.shiftKey) return; // Shift 없으면 줌으로 넘김
            e.preventDefault();
            if (e.deltaY > 0) { if (canNext) { setLoading(true); setStepIdx(v => v + 1); } }
            else { if (canPrev) { setLoading(true); setStepIdx(v => v - 1); } }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    });

    return (
        <div ref={containerRef} style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
            <OffscreenRenderer />
            <BackgroundBricks />
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                backgroundUrl={shareBackgroundUrl}
                ldrUrl={ldrUrl}
                loading={!shareBackgroundUrl || !ldrUrl}
            />

            <div className="kidsStep__mainContainer">
                {!isPreset ? (
                    <div className="kidsStep__sidebar">
                        <button onClick={() => router.back()} className="kidsStep__backBtn">
                            ← {t.kids.steps.back}
                        </button>

                        <h2 className="kidsStep__sidebarTitle">BRICKERS</h2>

                        <div className="kidsStep__sidebarSectionLabel">
                            {t.kids.steps.viewModes}
                        </div>

                        <div className="kidsStep__modeContainer">
                            <button onClick={() => setActiveTab('LDR')} className={`kidsStep__modeBtn ${activeTab === 'LDR' ? 'active' : ''}`}>
                                {t.kids.steps.tabBrick}
                            </button>
                            <button onClick={() => setActiveTab('GLB')} className={`kidsStep__modeBtn ${activeTab === 'GLB' ? 'active' : ''}`}>
                                {t.kids.steps.tabModeling}
                            </button>
                        </div>

                        <div className="kidsStep__colorContainer">
                            <button onClick={() => setIsColorModalOpen(true)} className="kidsStep__colorBtn">
                                {t.kids.steps?.changeColor || '색상 변경'}
                            </button>
                            {colorChangedLdrBase64 && (
                                <>
                                    <button onClick={downloadColorChangedLdr} className="kidsStep__downloadColorBtn">
                                        ⬇ {t.kids.steps.downloadLdr}
                                    </button>
                                    <button onClick={restoreOriginalColor} className="kidsStep__restoreBtn">
                                        ↺ {t.kids.steps?.restoreOriginal || '원본 복원'}
                                    </button>
                                </>
                            )}
                        </div>

                        <GalleryRegisterInput
                            t={t}
                            isRegisteredToGallery={isRegisteredToGallery}
                            isSubmitting={isSubmitting}
                            onRegister={handleRegisterGallery}
                        />

                        <div className="kidsStep__sidebarSection">
                            <div className="kidsStep__sidebarSectionLabel">
                                PDF Download
                            </div>
                            <button
                                className="kidsStep__sidebarBtn" onClick={handleDownloadPdf}
                                disabled={!serverPdfUrl || loading}
                            >
                                {serverPdfUrl ? t.kids.steps?.pdfDownloadBtn : t.kids.steps?.pdfPreparing}
                            </button>
                        </div>

                        <div className="kidsStep__sidebarSection">
                            <div className="kidsStep__sidebarSectionLabel">
                                File Download
                            </div>
                            <button
                                className="kidsStep__sidebarBtn"
                                onClick={downloadLdr}
                                disabled={!ldrUrl || loading}
                            >
                                LDR DOWNLOAD
                            </button>
                            <button
                                className="kidsStep__sidebarBtn"
                                style={{ marginTop: 8 }}
                                onClick={downloadGlb}
                                disabled={!glbUrl || loading}
                            >
                                GLB DOWNLOAD
                            </button>
                        </div>
                        <div className="kidsStep__sidebarSection">
                            <div className="kidsStep__sidebarSectionLabel">
                                이동하기
                            </div>
                            <button className="kidsStep__sidebarBtn" style={{ marginTop: 8 }} onClick={() => router.push("/")}>
                                홈으로
                            </button>
                            <button className="kidsStep__sidebarBtn" style={{ marginTop: 8 }} onClick={() => router.push("/gallery")}>
                                갤러리 보기
                            </button>

                            {/* 공유하기 버튼 추가 */}
                            <button
                                className="kidsStep__sidebarBtn"
                                style={{
                                    marginTop: 8,
                                    backgroundColor: shareBackgroundUrl ? '#000' : '#e0e0e0',
                                    color: shareBackgroundUrl ? '#fff' : '#000',
                                    cursor: shareBackgroundUrl ? 'pointer' : 'not-allowed'
                                }}
                                onClick={() => setShareModalOpen(true)}
                                disabled={!shareBackgroundUrl}
                            >
                                {shareBackgroundUrl ? "공유하기" : "배경 생성중..."}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="kidsStep__sidebarSpacer" />
                )}

                <div className="kidsStep__layoutCenter">
                    <div className="kidsStep__card kids-main-canvas">
                        {loading && (
                            <div className="kidsStep__loadingOverlay" style={{ pointerEvents: "none" }}>
                                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                <span>{t.kids.steps.loading}</span>
                            </div>
                        )}

                        {activeTab === 'LDR' && (
                            <div className="kidsStep__splitContainer">
                                {/* Left: Full Model */}
                                {!isAssemblyMode && (
                                    <div className="kidsStep__splitPane left full">
                                        <div className="kidsStep__paneLabel">완성 모습</div>
                                        <Canvas
                                            camera={{ position: [200, -200, 200], fov: 45 }}
                                            dpr={[1, 2]}
                                            gl={{ preserveDrawingBuffer: true }}
                                            frameloop="demand"
                                        >
                                            <ThrottledDriver />
                                            <ambientLight intensity={0.9} />
                                            <directionalLight position={[3, 5, 2]} intensity={1} />
                                            {ldrUrl && (
                                                <LdrModel
                                                    // No override -> Full model
                                                    url={sortedBlobUrl || ldrUrl}
                                                    onLoaded={(g) => { setLoading(false); }}
                                                    onError={() => setLoading(false)}
                                                    customBounds={modelBounds}
                                                    fitTrigger={`${ldrUrl}|left`}
                                                />
                                            )}
                                            <OrbitControls makeDefault enablePan={false} enableZoom />
                                        </Canvas>

                                        {!isAssemblyMode && (
                                            <div className="kidsStep__viewAssemblyOverlay">
                                                <button
                                                    className="kidsStep__viewAssemblyBtn"
                                                    onClick={() => { setLoading(true); setTimeout(() => { setIsAssemblyMode(true); setLoading(false); }, 100); }}
                                                >
                                                    {t.kids.steps?.viewAssembly || "조립서 보기"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Right: Step Model */}
                                {isAssemblyMode && (
                                    <div className="kidsStep__splitPane right full">
                                        <div className="kidsStep__paneLabel">조립 순서</div>
                                        <button
                                            className="kidsStep__viewFullBtn"
                                            onClick={() => { setLoading(true); setTimeout(() => { setIsAssemblyMode(false); setLoading(false); }, 100); }}
                                        >
                                            전체 3D 보기
                                        </button>
                                        <Canvas
                                            camera={{ position: [200, -200, 200], fov: 45 }}
                                            dpr={[1, 2]}
                                            gl={{ preserveDrawingBuffer: true }}
                                            frameloop="demand"
                                        >
                                            <ThrottledDriver />
                                            <ambientLight intensity={0.9} />
                                            <directionalLight position={[3, 5, 2]} intensity={1} />
                                            {ldrUrl && (
                                                <LdrModel
                                                    url={sortedBlobUrl || ldrUrl}
                                                    currentStep={stepIdx + 1}
                                                    stepMode={true}
                                                    onLoaded={(g) => { modelGroupRef.current = g; setLoading(false); }}
                                                    onError={() => setLoading(false)}
                                                    customBounds={modelBounds}
                                                    fitTrigger={`${ldrUrl}|${stepIdx}|right`}
                                                />
                                            )}
                                            <OrbitControls makeDefault enablePan={false} enableZoom />
                                        </Canvas>

                                        <div className="kidsStep__placeholder" />


                                        <div className="kidsStep__navOverlay">
                                            <button className="kidsStep__navBtn" disabled={!canPrev} onClick={() => { setLoading(true); setStepIdx(v => v - 1); }}>
                                                ← {t.kids.steps.prev}
                                            </button>
                                            <div className="kidsStep__stepInfo">
                                                Step {stepIdx + 1} <span style={{ color: "#aaa" }}>/ {total}</span>
                                            </div>
                                            {canNext && (
                                                <button className="kidsStep__navBtn kidsStep__navBtn--next" onClick={() => { setLoading(true); setStepIdx(v => v + 1); }}>
                                                    {t.kids.steps.next} →
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#aaa", marginTop: 4 }}>
                                            Shift + Scroll / ← → {t.kids.steps?.stepNavHint || '키로 단계 이동'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GLB Viewer */}
                        {activeTab === 'GLB' && (
                            <Canvas
                                camera={{ position: [5, 5, 5], fov: 50 }}
                                dpr={[1, 2]}
                                frameloop="demand"
                            >
                                <ThrottledDriver />
                                <ambientLight intensity={0.8} />
                                <directionalLight position={[5, 10, 5]} intensity={1.5} />
                                <Environment preset="city" />
                                {glbUrl && (
                                    <Bounds fit clip margin={1.35}>
                                        <Center>
                                            <Gltf src={glbUrl} />
                                        </Center>
                                        <FitOnceOnLoad trigger={glbUrl} />
                                    </Bounds>
                                )}
                                <OrbitControls makeDefault enablePan={false} enableZoom enableDamping />
                            </Canvas>
                        )}
                        {activeTab === 'GLB' && !glbUrl && <div className="kidsStep__noModel">3D Model not available</div>}
                    </div>
                </div>

                {isAssemblyMode && activeTab === 'LDR' ? (
                    <div className="kidsStep__rightSidebar">
                        <div className="kidsStep__rightSidebarHeader">
                            {t.kids.steps.tabBrick}
                        </div>
                        <div className="kidsStep__brickList">
                            {stepBricks[stepIdx] && stepBricks[stepIdx].length > 0 ? (
                                stepBricks[stepIdx].map((brick: any, idx: number) => (
                                    <div key={`${brick.partName}-${brick.color}-${idx}`} className="kidsStep__brickItem">
                                        <div className="kidsStep__brickCanvasContainer">
                                            <BrickThumbnail partName={brick.partName} color={brick.color} />
                                        </div>
                                        <div className="kidsStep__brickCount">x{brick.count}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="kidsStep__noBricks">No new bricks this step</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="kidsStep__sidebarSpacer" />
                )}

                {/* Gallery Modal */}
                {isGalleryModalOpen && (
                    <div className="galleryModalOverlay" onClick={() => setIsGalleryModalOpen(false)}>
                        <div className="galleryModal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="galleryModal__title">{t.kids.steps.galleryModal.title}</h3>
                            <GalleryRegisterInputModalAdapter
                                t={t}
                                onRegister={handleRegisterGallery}
                                isSubmitting={isSubmitting}
                                onClose={() => setIsGalleryModalOpen(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Color Modal */}
                {isColorModalOpen && (
                    <div className="galleryModalOverlay" onClick={() => setIsColorModalOpen(false)}>
                        <div className="galleryModal colorModal" onClick={(e) => e.stopPropagation()}>
                            <button className="modalCloseBtn" onClick={() => setIsColorModalOpen(false)}>✕</button>
                            <h3 className="galleryModal__title">{t.kids.steps.colorThemeTitle || "색상 테마 선택"}</h3>
                            <div className="colorModal__themes">
                                {colorThemes.length === 0 ? <div className="colorModal__loading">{t.kids.steps?.themeLoading || t.common.loading}</div> : (
                                    colorThemes.map((theme: ThemeInfo) => (
                                        <button key={theme.name} className={`colorModal__themeBtn ${selectedTheme === theme.name ? "selected" : ""}`} onClick={() => setSelectedTheme(theme.name)}>
                                            <span className="colorModal__themeName">{theme.name}</span>
                                            <span className="colorModal__themeDesc">{theme.description}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="galleryModal__actions">
                                <button className="galleryModal__btn galleryModal__btn--cancel" onClick={() => setIsColorModalOpen(false)}>{t.kids.steps.galleryModal.cancel}</button>
                                <button className="galleryModal__btn galleryModal__btn--confirm" onClick={handleApplyColor} disabled={!selectedTheme || isApplyingColor}>
                                    {isApplyingColor ? "..." : t.common?.apply}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}



export default function KidsStepPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KidsStepPageContent />
        </Suspense>
    );
}
