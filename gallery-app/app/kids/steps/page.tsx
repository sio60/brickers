'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, Center, Gltf, Environment } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { registerToGallery } from "@/lib/api/myApi";
import { getColorThemes, applyColorVariant, base64ToBlobUrl, ThemeInfo } from "@/lib/api/colorVariantApi";
import './KidsStepPage.css';

// SSR 제외

const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

function disposeObject3D(root: THREE.Object3D) {
    root.traverse((obj: any) => {
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
}: {
    url: string;
    overrideMainLdrUrl?: string;
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

            // LDraw 라이브러리 URL인 경우 경로 수정
            if (fixed.includes("ldraw-parts-library") && fixed.endsWith(".dat") && !fixed.includes("LDConfig.ldr")) {
                const filename = fixed.split("/").pop() || "";

                // Primitive 패턴: n-n*.dat (예: 4-4edge, 1-4cyli), stud*.dat, rect*.dat, box*.dat 등
                const isPrimitive = /^\d+-\d+/.test(filename) ||
                    /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);

                // Subpart 패턴: 파트번호 + s + 숫자.dat (예: 3003s02.dat)
                const isSubpart = /^\d+s\d+\.dat$/i.test(filename);

                // 1. 잘못된 경로 조합 수정
                fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
                fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

                // 2. primitive가 /parts/에 잘못 들어간 경우 /p/로 수정
                if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
                    fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
                }

                // 3. subpart가 /p/에 잘못 들어간 경우 /parts/s/로 수정
                if (isSubpart && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
                    fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
                }

                // 4. 경로가 없는 경우 적절한 경로 추가
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
            <Center>
                <primitive object={group} />
            </Center>
        </Bounds>
    );
}

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const jobId = searchParams.get("jobId") || "";
    const urlParam = searchParams.get("url") || "";

    const [ldrUrl, setLdrUrl] = useState<string>(urlParam);
    const [loading, setLoading] = useState(true);
    const [stepIdx, setStepIdx] = useState(0);
    const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
    const blobRef = useRef<string[]>([]);
    const modelGroupRef = useRef<THREE.Group | null>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const [galleryTitle, setGalleryTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);

    const [isPreviewMode, setIsPreviewMode] = useState(true);

    // 색상 변경 관련
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);

    const revokeAll = (arr: string[]) => {
        arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
    };

    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB'>('LDR');
    const [glbUrl, setGlbUrl] = useState<string | null>(null);

    // Fetch Job Info
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
                }
            } catch (e) {
                console.error("[KidsStepPage] failed to resolve job info:", e);
            }
        })();
        return () => { alive = false; };
    }, [jobId, ldrUrl]);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!ldrUrl) return;
            setLoading(true);
            setStepIdx(0);
            const res = await fetch(ldrUrl);
            if (!res.ok) throw new Error(`LDR fetch failed: ${res.status}`);
            const text = await res.text();
            const stepTexts = buildCumulativeStepTexts(text);
            const blobs = stepTexts.map((t) => URL.createObjectURL(new Blob([t], { type: "text/plain" })));
            if (!alive) { revokeAll(blobs); return; }
            revokeAll(blobRef.current);
            blobRef.current = blobs;
            setStepBlobUrls(blobs);
        })().catch((e) => {
            console.error("[KidsStepPage] build steps failed:", e);
            setLoading(false);
        });
        return () => { alive = false; };
    }, [ldrUrl]);

    useEffect(() => {
        return () => revokeAll(blobRef.current);
    }, []);

    const downloadLdr = async () => {
        if (!ldrUrl) return;
        try {
            const res = await fetch(ldrUrl);
            const text = await res.text();
            const blob = new Blob([text], { type: "text/plain" });
            const dUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dUrl;
            link.download = "brickers_model.ldr";
            link.click();
            URL.revokeObjectURL(dUrl);
        } catch (err) { console.error(err); }
    };

    const downloadGlb = async () => {
        if (!jobId) {
            if (!modelGroupRef.current) return;
            const exporter = new GLTFExporter();
            exporter.parse(modelGroupRef.current, (result) => {
                const output = result instanceof ArrayBuffer ? result : JSON.stringify(result);
                const blob = new Blob([output], { type: result instanceof ArrayBuffer ? "application/octet-stream" : "application/json" });
                const dUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = dUrl;
                link.download = "brickers_model.glb";
                link.click();
                URL.revokeObjectURL(dUrl);
            }, (error) => console.error(error), { binary: true });
            return;
        }
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const res = await fetch(`${API_BASE}/api/kids/jobs/${jobId}`, { credentials: 'include' });
            const data = await res.json();
            const glbUrl = data.glbUrl || data.glb_url;
            if (!glbUrl) return alert(t.kids.steps.glbNotFound);
            const link = document.createElement("a");
            link.href = glbUrl;
            link.download = `brickers_${jobId}.glb`;
            link.click();
        } catch (e) { console.error(e); }
    };

    const handleRegisterGallery = async () => {
        if (!galleryTitle.trim()) return alert(t.kids.steps.galleryModal.placeholder);
        setIsSubmitting(true);
        try {
            await registerToGallery({
                title: galleryTitle,
                content: t.kids.steps.galleryModal.content,
                tags: ["Kids", "Brick"],
                thumbnailUrl: jobThumbnailUrl || undefined,
                ldrUrl: ldrUrl || undefined,
                visibility: "PUBLIC",
            });
            alert(t.kids.steps.galleryModal.success);
            setIsGalleryModalOpen(false);
            setGalleryTitle("");
        } catch (err) { console.error(err); alert(t.kids.steps.galleryModal.fail); }
        finally { setIsSubmitting(false); }
    };

    // 색상 모달 열 때 테마 로드
    const openColorModal = async () => {
        setIsColorModalOpen(true);
        if (colorThemes.length === 0) {
            try {
                const themes = await getColorThemes();
                setColorThemes(themes);
            } catch (e) {
                console.error("테마 로드 실패:", e);
            }
        }
    };

    // 색상 변경 적용
    const handleApplyColor = async () => {
        if (!selectedTheme || !ldrUrl) return;

        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(ldrUrl, selectedTheme, authFetch);

            if (result.ok && result.ldrData) {
                const newBlobUrl = base64ToBlobUrl(result.ldrData);
                setLdrUrl(newBlobUrl);
                // 스텝 데이터도 다시 로드 필요
                setStepBlobUrls([]);
                setStepIdx(0);
                setIsColorModalOpen(false);
                alert(`${result.themeApplied} 테마 적용 완료! (${result.changedBricks}개 브릭 변경)`);
            } else {
                alert(result.message || "색상 변경 실패");
            }
        } catch (e: any) {
            console.error("색상 변경 실패:", e);
            alert(e.message || "색상 변경 중 오류가 발생했습니다.");
        } finally {
            setIsApplyingColor(false);
        }
    };

    const total = stepBlobUrls.length || 1;
    const currentOverride = stepBlobUrls[Math.min(stepIdx, stepBlobUrls.length - 1)];
    const canPrev = stepIdx > 0;
    const canNext = stepIdx < total - 1;
    const modelUrlToUse = isPreviewMode ? undefined : currentOverride;

    return (
        <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex" }}>
            {/* Sidebar */}
            <div style={{
                width: 280,
                background: "#1a1a1a",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                padding: "24px 16px",
                flexShrink: 0
            }}>
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    style={{
                        alignSelf: "flex-start",
                        marginBottom: 32,
                        background: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: 600
                    }}
                >
                    ← {t.kids.steps.back}
                </button>

                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 24, paddingLeft: 8 }}>
                    BRICKERS
                </h2>

                {/* Categories */}
                <div style={{ marginBottom: 12, paddingLeft: 8, fontSize: "0.85rem", color: "#888", fontWeight: 600 }}>
                    {t.kids.steps.viewModes}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                        onClick={() => setActiveTab('LDR')}
                        style={{
                            textAlign: "left",
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: activeTab === 'LDR' ? "#3b82f6" : "transparent",
                            color: activeTab === 'LDR' ? "#fff" : "#ccc",
                            fontWeight: activeTab === 'LDR' ? 700 : 500,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        🧱 {t.kids.steps.tabBrick}
                    </button>
                    <button
                        onClick={() => setActiveTab('GLB')}
                        style={{
                            textAlign: "left",
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: activeTab === 'GLB' ? "#3b82f6" : "transparent",
                            color: activeTab === 'GLB' ? "#fff" : "#ccc",
                            fontWeight: activeTab === 'GLB' ? 700 : 500,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        🧊 {t.kids.steps.tabModeling}
                    </button>
                </div>

                {/* 색상 변경 버튼 */}
                {searchParams.get("isPreset") !== "true" && (
                    <>
                        <div style={{ marginTop: 24, marginBottom: 12, paddingLeft: 8, fontSize: "0.85rem", color: "#888", fontWeight: 600 }}>
                            색상 변경
                        </div>
                        <button
                            onClick={openColorModal}
                            className="kidsStep__colorBtn"
                            style={{
                                textAlign: "left",
                                padding: "12px 16px",
                                borderRadius: 12,
                                background: "#3b82f6",
                                color: "#fff",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            색상 변경
                        </button>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
                {/* Top Bar inside Content Area */}
                <div style={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 24px",
                    background: "#fff",
                    borderBottom: "1px solid #e5e5e5"
                }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                        {activeTab === 'LDR'
                            ? (isPreviewMode ? t.kids.steps.previewTitle : t.kids.steps.title.replace("{cur}", String(stepIdx + 1)).replace("{total}", String(total)))
                            : t.kids.steps.originalModel
                        }
                    </div>
                    {/* Action Buttons (Download/Register) - Only show relevant ones */}
                    {searchParams.get("isPreset") !== "true" && (
                        <div style={{ display: "flex", gap: 8 }}>
                            {activeTab === 'GLB' && <button className="kidsStep__actionBtn" onClick={downloadGlb}>{t.kids.steps.downloadGlb}</button>}
                            {activeTab === 'LDR' && <button className="kidsStep__actionBtn" onClick={downloadLdr}>{t.kids.steps.downloadLdr}</button>}
                            <button className="kidsStep__actionBtn kidsStep__actionBtn--gallery" onClick={() => setIsGalleryModalOpen(true)}>{t.kids.steps.registerGallery}</button>
                        </div>
                    )}
                </div>

                {/* Canvas Container */}
                <div style={{ flex: 1, position: "relative", background: "#f0f0f0" }}>
                    {loading && (
                        <div style={{
                            position: "absolute", inset: 0, zIndex: 10,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.75)", fontWeight: 900
                        }}>
                            {t.kids.steps.loading}
                        </div>
                    )}

                    {activeTab === 'LDR' ? (
                        <>
                            <div style={{ position: "absolute", inset: 0 }}>
                                <Canvas camera={{ position: [200, -200, 200], fov: 45 }} dpr={[1, 2]}>
                                    <ambientLight intensity={0.9} />
                                    <directionalLight position={[3, 5, 2]} intensity={1} />
                                    <LdrModel
                                        url={ldrUrl}
                                        overrideMainLdrUrl={modelUrlToUse}
                                        onLoaded={(g) => { setLoading(false); modelGroupRef.current = g; }}
                                        onError={() => setLoading(false)}
                                    />
                                    <OrbitControls makeDefault enablePan={false} enableZoom />
                                </Canvas>
                            </div>

                            {/* LDR Overlays (Start Button or Step Nav) */}
                            {isPreviewMode ? (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 40, pointerEvents: "none" }}>
                                    <button
                                        onClick={() => { setIsPreviewMode(false); setStepIdx(0); }}
                                        style={{
                                            pointerEvents: "auto",
                                            padding: "14px 28px",
                                            fontSize: "1.1rem",
                                            borderRadius: 999,
                                            background: "#000",
                                            color: "#fff",
                                            fontWeight: 700,
                                            border: "none",
                                            cursor: "pointer",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                                        }}
                                    >
                                        {t.kids.steps.startAssembly}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16 }}>
                                    <button disabled={!canPrev} onClick={() => { setLoading(true); setStepIdx(v => v - 1); }} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", cursor: canPrev ? "pointer" : "not-allowed", opacity: canPrev ? 1 : 0.5, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>← {t.kids.steps.prev}</button>
                                    <button disabled={!canNext} onClick={() => { setLoading(true); setStepIdx(v => v + 1); }} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#000", color: "#fff", cursor: canNext ? "pointer" : "not-allowed", opacity: canNext ? 1 : 0.5, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{t.kids.steps.next} →</button>
                                </div>
                            )}
                        </>
                    ) : (
                        // GLB Viewer
                        <div style={{ position: "absolute", inset: 0 }}>
                            <Canvas camera={{ position: [5, 5, 5], fov: 50 }} dpr={[1, 2]}>
                                <ambientLight intensity={0.8} />
                                <directionalLight position={[5, 10, 5]} intensity={1.5} />
                                <Environment preset="city" />
                                <Bounds fit clip observe margin={1.2}>
                                    <Center>
                                        {glbUrl && <Gltf src={glbUrl} />}
                                    </Center>
                                </Bounds>
                                <OrbitControls makeDefault enablePan={false} enableZoom />
                            </Canvas>
                            {!glbUrl && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>3D Model not available</div>}
                        </div>
                    )}
                </div>
            </div>

            {/* Gallery Modal */}
            {isGalleryModalOpen && (
                <div className="galleryModalOverlay" onClick={() => setIsGalleryModalOpen(false)}>
                    <div className="galleryModal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="galleryModal__title">{t.kids.steps.galleryModal.title}</h3>
                        <input type="text" className="galleryModal__input" value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} placeholder={t.kids.steps.galleryModal.placeholder} autoFocus />
                        <div className="galleryModal__actions">
                            <button className="galleryModal__btn galleryModal__btn--cancel" onClick={() => setIsGalleryModalOpen(false)}>{t.kids.steps.galleryModal.cancel}</button>
                            <button className="galleryModal__btn galleryModal__btn--confirm" onClick={handleRegisterGallery} disabled={isSubmitting}>{isSubmitting ? "..." : t.kids.steps.galleryModal.confirm}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 색상 변경 모달 */}
            {isColorModalOpen && (
                <div className="colorModalOverlay" onClick={() => setIsColorModalOpen(false)}>
                    <div className="colorModal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="colorModal__title">🎨 색상 테마 선택</h3>

                        <div className="colorModal__themes">
                            {colorThemes.length === 0 ? (
                                <div className="colorModal__loading">테마 로딩 중...</div>
                            ) : (
                                colorThemes.map((theme) => (
                                    <button
                                        key={theme.name}
                                        className={`colorModal__themeBtn ${selectedTheme === theme.name ? "colorModal__themeBtn--selected" : ""}`}
                                        onClick={() => setSelectedTheme(theme.name)}
                                    >
                                        <span className="colorModal__themeName">{theme.name}</span>
                                        <span className="colorModal__themeDesc">{theme.description}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="colorModal__actions">
                            <button
                                className="colorModal__btn colorModal__btn--cancel"
                                onClick={() => setIsColorModalOpen(false)}
                            >
                                취소
                            </button>
                            <button
                                className="colorModal__btn colorModal__btn--confirm"
                                onClick={handleApplyColor}
                                disabled={!selectedTheme || isApplyingColor}
                            >
                                {isApplyingColor ? "적용 중..." : "적용하기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

