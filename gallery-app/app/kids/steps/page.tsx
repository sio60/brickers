'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, Center, Gltf, Environment, useBounds } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { registerToGallery } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, downloadLdrFromBase64, type ThemeInfo } from "@/lib/api/colorVariantApi";
import BackgroundBricks from "@/components/BackgroundBricks";
import './KidsStepPage.css';

// SSR 제외
const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

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

function LdrModel({
    url,
    overrideMainLdrUrl,
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
    customBounds,
    fitTrigger,
}: {
    url: string;
    overrideMainLdrUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    customBounds?: THREE.Box3 | null;
    fitTrigger?: string;
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
            fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
            fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");
            if (overrideMainLdrUrl) {
                try {
                    const abs = new URL(fixed, window.location.href).href;
                    if (abs === mainAbs) return overrideMainLdrUrl;
                } catch { }
            }

            const isAbsolute = fixed.startsWith("http") || fixed.startsWith("blob:") || fixed.startsWith("/") || fixed.includes(":");
            if (overrideMainLdrUrl && !isAbsolute) {
                try { fixed = new URL(fixed, url).href; } catch { }
            }

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
    }, [partsLibraryPath, url, overrideMainLdrUrl]);

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
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError]);

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
        <Bounds fit clip margin={1.35}>
            <Center>
                <primitive object={group} />
                {boundMesh}
            </Center>
            <FitOnceOnLoad trigger={fitTrigger ?? ""} />
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
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #eee" }}>
            <div style={{ marginBottom: 12, paddingLeft: 8, fontSize: "0.75rem", color: "#888", fontWeight: 800 }}>
                {t.kids.steps.registerGallery}
            </div>
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
    const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null);
    const blobRef = useRef<string[]>([]);
    const modelGroupRef = useRef<THREE.Group | null>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    // const [galleryTitle, setGalleryTitle] = useState(""); // -> Moved to child component
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);
    const [isRegisteredToGallery, setIsRegisteredToGallery] = useState(false);
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [brickCount, setBrickCount] = useState<number>(0);
    const [isProMode, setIsProMode] = useState(false);
    const [jobScreenshotUrls, setJobScreenshotUrls] = useState<Record<string, string> | null>(null);

    const [isPreviewMode, setIsPreviewMode] = useState(true);
    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB'>('LDR');
    const [glbUrl, setGlbUrl] = useState<string | null>(null);

    // Color Variant State
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

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
                        const { stepTexts } = e.data.payload;
                        const blobs = stepTexts.map((t_blob: string) =>
                            URL.createObjectURL(new Blob([t_blob], { type: "text/plain" }))
                        );
                        revokeAll(blobRef.current);
                        blobRef.current = blobs;
                        setStepBlobUrls(blobs);
                        setStepIdx(stepTexts.length - 1);
                        setIsPreviewMode(false);
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
                    const { stepTexts, bounds } = e.data.payload;
                    if (bounds) {
                        setModelBounds(new THREE.Box3(
                            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
                            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
                        ));
                    }
                    const blobs = stepTexts.map((t: string) => URL.createObjectURL(new Blob([t], { type: "text/plain" })));
                    revokeAll(blobRef.current);
                    blobRef.current = blobs;
                    setStepBlobUrls(blobs);
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
                    const { stepTexts, bounds } = e.data.payload;
                    if (bounds) {
                        setModelBounds(new THREE.Box3(
                            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
                            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
                        ));
                    }
                    const blobs = stepTexts.map((t_blob: string) => URL.createObjectURL(new Blob([t_blob], { type: "text/plain" })));
                    revokeAll(blobRef.current);
                    blobRef.current = blobs;
                    setStepBlobUrls(blobs);
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
        return () => revokeAll(blobRef.current);
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
    const currentOverride = stepBlobUrls[Math.min(stepIdx, stepBlobUrls.length - 1)];
    const canPrev = stepIdx > 0;
    const canNext = stepIdx < total - 1;
    const finalModelUrl = isPreviewMode ? undefined : currentOverride;
    const isPreset = searchParams.get("isPreset") === "true";

    return (
        <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
            <BackgroundBricks />

            <div className="kidsStep__mainContainer" style={{ paddingLeft: isPreset ? 0 : 260 }}>
                {!isPreset && (
                    <div style={{
                        position: "absolute", top: 100, left: 24, zIndex: 20, width: 260,
                        background: "#fff", borderRadius: 32, color: "#000",
                        display: "flex", flexDirection: "column", padding: "24px 16px",
                        border: "3px solid #000", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)"
                    }}>
                        <button onClick={() => router.back()} className="kidsStep__backBtn">
                            ← {t.kids.steps.back}
                        </button>

                        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 20, paddingLeft: 8 }}>BRICKERS</h2>

                        <div style={{ marginBottom: 10, paddingLeft: 8, fontSize: "0.75rem", color: "#888", fontWeight: 800 }}>
                            {t.kids.steps.viewModes}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <button onClick={() => setActiveTab('LDR')} className={`kidsStep__modeBtn ${activeTab === 'LDR' ? 'active' : ''}`}>
                                {t.kids.steps.tabBrick}
                            </button>
                            <button onClick={() => setActiveTab('GLB')} className={`kidsStep__modeBtn ${activeTab === 'GLB' ? 'active' : ''}`}>
                                {t.kids.steps.tabModeling}
                            </button>
                        </div>

                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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

                        <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #eee" }}>
                            <div style={{ marginBottom: 12, paddingLeft: 8, fontSize: "0.75rem", color: "#888", fontWeight: 800 }}>
                                PDF Download
                            </div>
                            <button
                                className="kidsStep__sidebarBtn" onClick={handleDownloadPdf}
                                disabled={!serverPdfUrl || loading}
                                style={{ background: serverPdfUrl ? "#444" : "#aaa" }}
                            >
                                {serverPdfUrl ? t.kids.steps?.pdfDownloadBtn : t.kids.steps?.pdfPreparing}
                            </button>
                        </div>
                    </div>
                )}

                <div className="kidsStep__card kids-main-canvas">
                    {loading && (
                        <div className="kidsStep__loadingOverlay">
                            <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                            <span>{t.kids.steps.loading}</span>
                        </div>
                    )}

                    {activeTab === 'LDR' && (
                        <Canvas
                            camera={{ position: [200, -200, 200], fov: 45 }}
                            dpr={[1, 2]}
                            gl={{ preserveDrawingBuffer: true }}
                        >
                            <ambientLight intensity={0.9} />
                            <directionalLight position={[3, 5, 2]} intensity={1} />
                            {ldrUrl && (
                                <LdrModel
                                    url={ldrUrl}
                                    overrideMainLdrUrl={finalModelUrl}
                                    onLoaded={(g) => { setLoading(false); modelGroupRef.current = g; }}
                                    onError={() => setLoading(false)}
                                    customBounds={modelBounds}
                                    fitTrigger={`${ldrUrl}|${finalModelUrl ?? ''}`}
                                />
                            )}
                            <OrbitControls makeDefault enablePan={false} enableZoom />
                        </Canvas>
                    )}

                    {activeTab === 'LDR' && (
                        <>
                            {isPreviewMode ? (
                                <div className="kidsStep__previewOverlay">
                                    <button onClick={() => { setIsPreviewMode(false); setStepIdx(0); }} className="kidsStep__startNavBtn">
                                        {t.kids.steps.startAssembly}
                                    </button>
                                </div>
                            ) : (
                                <div className="kidsStep__navOverlay">
                                    <button className="kidsStep__navBtn" disabled={!canPrev} onClick={() => { setLoading(true); setStepIdx(v => v - 1); }}>
                                        ← {t.kids.steps.prev}
                                    </button>
                                    <div className="kidsStep__stepInfo">
                                        Step {stepIdx + 1} <span style={{ color: "#aaa" }}>/ {total}</span>
                                    </div>
                                    <button className="kidsStep__navBtn kidsStep__navBtn--next" disabled={!canNext} onClick={() => { setLoading(true); setStepIdx(v => v + 1); }}>
                                        {t.kids.steps.next} →
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* GLB Viewer */}
                    {activeTab === 'GLB' && (
                        <Canvas
                            camera={{ position: [5, 5, 5], fov: 50 }}
                            dpr={[1, 2]}
                        >
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
                            <OrbitControls makeDefault enablePan={false} enableZoom autoRotate autoRotateSpeed={2.5} enableDamping />
                        </Canvas>
                    )}
                    {activeTab === 'GLB' && !glbUrl && <div className="kidsStep__noModel">3D Model not available</div>}
                </div>
            </div>

            {/* Gallery Modal (모달에도 입력창이 있는데 이건 별도임. 아마 모바일용/다른 경로용?) */}
            {isGalleryModalOpen && (
                <div className="galleryModalOverlay" onClick={() => setIsGalleryModalOpen(false)}>
                    <div className="galleryModal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="galleryModal__title">{t.kids.steps.galleryModal.title}</h3>
                        {/* 이 모달 내의 입력도 깜빡일 수 있으나 사이드바 문제가 급선무. 여기는 별도 state [galleryTitle state가 제거되었으므로 수정 필요] */}
                        {/* 
                           주의: galleryTitle state를 제거했으므로 여기도 수정해야 함.
                           모달용 input state를 별도로 만들거나, GalleryRegisterInput를 재사용해야 함.
                           하지만 모달 로직은 현재 보여지지 않는 듯함(사이드바에 박혀있음).
                           혹시 모르니 로컬 state를 사용하는 방식으로 수정.
                        */}
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
    );
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

export default function KidsStepPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KidsStepPageContent />
        </Suspense>
    );
}
