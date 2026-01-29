'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { useLanguage } from "@/contexts/LanguageContext";
import { registerToGallery } from "@/lib/api/myApi";
import './KidsStepPage.css';

// SSR 제외
const FloatingMenuButton = dynamic(() => import("@/components/kids/FloatingMenuButton"), { ssr: false });

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

            if (fixed.includes("ldraw-parts-library") && !fixed.includes("/parts/") && !fixed.includes("/p/") && !fixed.includes("LDConfig.ldr")) {
                if (fixed.endsWith(".dat")) {
                    const filename = fixed.split("/").pop() || "";
                    const isPrimitive = /^\d+-\d+/.test(filename) || /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud)/.test(filename);
                    const isSubpart = /^\d+s\d+\.dat$/.test(filename);
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
            <primitive object={group} />
        </Bounds>
    );
}

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

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

    const revokeAll = (arr: string[]) => {
        arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
    };

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
                tags: ["Kids", "Lego"],
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

    if (!ldrUrl) return <div style={{ padding: 16 }}><button onClick={() => router.back()}>← {t.kids.steps.back}</button><div>{t.kids.steps.noUrl}</div></div>;

    const total = stepBlobUrls.length || 1;
    const currentOverride = stepBlobUrls[Math.min(stepIdx, stepBlobUrls.length - 1)];
    const canPrev = stepIdx > 0;
    const canNext = stepIdx < total - 1;

    return (
        <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)" }}>
                <button onClick={() => router.back()} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 800, cursor: "pointer" }}>← {t.kids.steps.back}</button>
                <div style={{ fontWeight: 900, opacity: 0.9 }}>BRICKERS</div>
                <div style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 900 }}>
                    {t.kids.steps.title.replace("{cur}", String(stepIdx + 1)).replace("{total}", String(total))}
                </div>
            </div>

            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "28px 20px 36px" }}>
                <div style={{ width: "min(1100px, 92vw)", aspectRatio: "16 / 9", borderRadius: 18, background: "rgba(255,255,255,0.92)", border: "2px solid #000", boxShadow: "0 18px 40px rgba(0,0,0,0.14)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.9)", fontWeight: 900 }}>{t.kids.steps.preview}</div>
                    {loading && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.75)", fontWeight: 900 }}>{t.kids.steps.loading}</div>}
                    <div style={{ position: "absolute", inset: 0 }}>
                        <Canvas camera={{ position: [220, 0, 220], fov: 45 }} dpr={[1, 2]}>
                            <ambientLight intensity={0.9} />
                            <directionalLight position={[3, 5, 2]} intensity={1} />
                            <LdrModel url={ldrUrl} overrideMainLdrUrl={currentOverride} onLoaded={(g) => { setLoading(false); modelGroupRef.current = g; }} onError={() => setLoading(false)} />
                            <OrbitControls makeDefault enablePan={false} enableZoom />
                        </Canvas>
                    </div>
                    <button disabled={!canPrev} onClick={() => { setLoading(true); setStepIdx(v => v - 1); }} style={{ position: "absolute", left: 16, bottom: 16, zIndex: 7, padding: "10px 14px", borderRadius: 14, border: "1px solid #000", background: "#fff", cursor: canPrev ? "pointer" : "not-allowed", opacity: canPrev ? 1 : 0.45, fontWeight: 900 }}>← {t.kids.steps.prev}</button>
                    <button disabled={!canNext} onClick={() => { setLoading(true); setStepIdx(v => v + 1); }} style={{ position: "absolute", right: 16, bottom: 16, zIndex: 7, padding: "10px 14px", borderRadius: 14, border: "1px solid #000", background: "#fff", cursor: canNext ? "pointer" : "not-allowed", opacity: canNext ? 1 : 0.45, fontWeight: 900 }}>{t.kids.steps.next} →</button>
                </div>
            </div>

            {searchParams.get("isPreset") !== "true" && (
                <div className="kidsStep__actionContainer">
                    <button className="kidsStep__actionBtn" onClick={downloadGlb}>{t.kids.steps.downloadGlb}</button>
                    <button className="kidsStep__actionBtn" onClick={downloadLdr}>{t.kids.steps.downloadLdr}</button>
                    <button className="kidsStep__actionBtn kidsStep__actionBtn--gallery" onClick={() => setIsGalleryModalOpen(true)}>{t.kids.steps.registerGallery}</button>
                </div>
            )}

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
            <FloatingMenuButton />
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

