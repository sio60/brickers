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
import { getColorThemes, applyColorVariant, base64ToBlobUrl, downloadLdrFromBase64, type ThemeInfo } from "@/lib/api/colorVariantApi";
import BackgroundBricks from "@/components/BackgroundBricks";
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
    customBounds,
}: {
    url: string;
    overrideMainLdrUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    customBounds?: THREE.Box3 | null;
}) {
    // ... (loader useMemo remains same) ...
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

    // Custom Bounds 처리 (Invisible Box)
    let boundMesh = null;
    if (customBounds) {
        const size = new THREE.Vector3();
        customBounds.getSize(size);
        const center = new THREE.Vector3();
        customBounds.getCenter(center);

        // LDraw 좌표계 보정 (rotation.x = Math.PI 적용됨)
        // Group이 pi 회전하므로, box도 맞춰야 함. 하지만 Center 내부에 있으므로 Center가 알아서 처리?
        // 아니, customBounds는 raw LDR 좌표 기준일 것.
        // Group이 180도 돌면 Y가 반전됨.

        boundMesh = (
            <mesh position={[center.x, -center.y, center.z]}>
                <boxGeometry args={[size.x, size.y, size.z]} />
                <meshBasicMaterial transparent opacity={0} wireframe />
            </mesh>
        );
    }

    return (
        <Bounds fit clip observe margin={1.2}>
            <Center>
                <primitive object={group} />
                {boundMesh}
            </Center>
        </Bounds>
    );
}

// LDR 파싱 및 정렬 유틸
function parseAndProcessSteps(ldrText: string) {
    const lines = ldrText.replace(/\r\n/g, "\n").split("\n");

    // 1. 전체 Bounds 계산 및 Step 분리
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const segments: { lines: string[], avgY: number }[] = [];
    let curLines: string[] = [];
    let curYSum = 0;
    let curCount = 0;

    let hasStep = false;

    const flush = () => {
        const avgY = curCount > 0 ? curYSum / curCount : -Infinity; // 부품 없으면 맨 위로?
        segments.push({ lines: curLines, avgY });
        curLines = [];
        curYSum = 0;
        curCount = 0;
    };

    for (const raw of lines) {
        const line = raw.trim();

        // Step 구분
        if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
            hasStep = true;
            flush();
            continue;
        }

        // 부품 라인 파싱 (Type 1)
        // 1 <colour> x y z a b c d e f g h i <file>
        if (line.startsWith('1 ')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 15) {
                const x = parseFloat(parts[2]);
                const y = parseFloat(parts[3]);
                const z = parseFloat(parts[4]);

                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
                    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);

                    curYSum += y;
                    curCount++;
                }
            }
        }

        curLines.push(raw);
    }
    flush();

    // 2. 정렬 (LDraw 좌표계: Y가 아래쪽. 즉 Y가 클수록 바닥. 바닥부터 쌓으려면 Y 내림차순 정렬)
    // 단, 첫 번째 세그먼트(헤더 등)는 무조건 맨 앞에? 보통 헤더에는 부품이 없음.
    // 하지만 segments[0]에 부품이 있을 수도 있음.
    // 전략: 부품이 있는 세그먼트들만 정렬한다?
    // 보통 헤더(메타데이터)는 curCount=0일 것임.

    // 단순하게: 전체를 Y 내림차순(큰거->작은거)으로 정렬.
    // AvgY가 -Infinity(부품없음)인 경우... 메타데이터일 수 있는데, 이들을 맨 앞으로 보낼까?
    // 보통 메타데이터는 0 STEP 이전에 나옴 (segments[0]).
    // segments[0]는 고정하고 나머지만 정렬?

    const header = segments[0];
    const body = segments.slice(1);

    // Y 내림차순 (큰 값 = 바닥 = 먼저 조립)
    body.sort((a, b) => b.avgY - a.avgY);

    const sortedSegments = [header, ...body];

    // 3. 누적 텍스트 생성
    const out: string[] = [];
    let acc: string[] = [];

    for (const seg of sortedSegments) {
        acc = acc.concat(seg.lines);
        out.push(acc.join("\n"));
    }

    // Bounds 생성
    let bounds = null;
    if (minX !== Infinity) {
        bounds = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
        );
    }

    return { stepTexts: out, bounds };
}

function KidsStepPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const jobId = searchParams.get("jobId") || "";
    const urlParam = searchParams.get("url") || "";

    const [ldrUrl, setLdrUrl] = useState<string>(urlParam);
    const [originalLdrUrl] = useState<string>(urlParam); // 원본 URL 보존
    const [loading, setLoading] = useState(true);
    const [stepIdx, setStepIdx] = useState(0);
    const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
    const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null);
    const blobRef = useRef<string[]>([]);
    const modelGroupRef = useRef<THREE.Group | null>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const [galleryTitle, setGalleryTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);

    const [isPreviewMode, setIsPreviewMode] = useState(true);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);

    // Color Variant State
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorThemes, setColorThemes] = useState<any[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>("");
    const [isApplyingColor, setIsApplyingColor] = useState(false);
    const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

    const revokeAll = (arr: string[]) => {
        arr.forEach((u) => { try { URL.revokeObjectURL(u); } catch { } });
    };

    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB'>('LDR');
    const [glbUrl, setGlbUrl] = useState<string | null>(null);

    // 색상 테마 목록 로드
    useEffect(() => {
        if (isColorModalOpen && colorThemes.length === 0) {
            getColorThemes()
                .then(setColorThemes)
                .catch((e) => console.error("테마 로드 실패:", e));
        }
    }, [isColorModalOpen, colorThemes.length]);

    // 색상 변경 적용
    const handleApplyColor = async () => {
        if (!selectedTheme || !ldrUrl) return;

        setIsApplyingColor(true);
        try {
            const result = await applyColorVariant(ldrUrl, selectedTheme, authFetch);

            if (result.ok && result.ldrData) {
                // 새 blob URL 생성 및 저장
                const newBlobUrl = base64ToBlobUrl(result.ldrData);
                // setLdrUrl(newBlobUrl); // 원본 URL은 유지하고 override를 통해 보여줄수도 있지만, 여기선 ldrUrl을 업데이트하는게 나을지 판단 필요
                // 일단 base64만 저장해둠 (다운로드용)
                setColorChangedLdrBase64(result.ldrData);

                // step blob들 재생성
                const text = atob(result.ldrData);
                const stepTexts = buildCumulativeStepTexts(text);
                const blobs = stepTexts.map((t) =>
                    URL.createObjectURL(new Blob([t], { type: "text/plain" }))
                );

                revokeAll(blobRef.current);
                blobRef.current = blobs;
                setStepBlobUrls(blobs);
                setStepIdx(stepTexts.length - 1); // 마지막 단계로 이동
                setIsPreviewMode(false); // 미리보기 모드 해제하여 변경된 결과 바로 확인

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

    // 원본 색상 복원
    const restoreOriginalColor = async () => {
        if (!originalLdrUrl) return;
        setLoading(true);
        try {
            const res = await fetch(originalLdrUrl);
            if (!res.ok) throw new Error(`LDR fetch failed: ${res.status}`);
            const text = await res.text();

            // 정렬 및 Bounds 계산 적용
            const { stepTexts, bounds } = parseAndProcessSteps(text);
            setModelBounds(bounds);

            const blobs = stepTexts.map((t) =>
                URL.createObjectURL(new Blob([t], { type: "text/plain" }))
            );
            revokeAll(blobRef.current);
            blobRef.current = blobs;
            setStepBlobUrls(blobs);
            setColorChangedLdrBase64(null);
            setSelectedTheme("");
            setStepIdx(stepTexts.length - 1);
        } catch (e) {
            console.error("원본 복원 실패:", e);
        } finally {
            setLoading(false);
        }
    };

    const downloadColorChangedLdr = () => {
        if (colorChangedLdrBase64) {
            downloadLdrFromBase64(colorChangedLdrBase64, `brickers_${selectedTheme}.ldr`);
        }
    };

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

            // 정렬 및 Bounds 계산 적용
            const { stepTexts, bounds } = parseAndProcessSteps(text);
            setModelBounds(bounds);

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
                sourceImageUrl: jobThumbnailUrl || undefined,
                glbUrl: glbUrl || undefined,
                visibility: "PUBLIC",
            });
            alert(t.kids.steps.galleryModal.success);
            setIsGalleryModalOpen(false);
            setGalleryTitle("");
        } catch (err) { console.error(err); alert(t.kids.steps.galleryModal.fail); }
        finally { setIsSubmitting(false); }
    };

    const total = stepBlobUrls.length || 1;
    const currentOverride = stepBlobUrls[Math.min(stepIdx, stepBlobUrls.length - 1)];
    const canPrev = stepIdx > 0;
    const canNext = stepIdx < total - 1;
    const modelUrlToUse = isPreviewMode ? undefined : currentOverride;

    const isPreset = searchParams.get("isPreset") === "true";

    return (
        <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
            {/* 3D Background Bricks */}
            <BackgroundBricks />

            {/* Content Container - Relative to center children */}
            <div className="kidsStep__mainContainer" style={{ paddingLeft: isPreset ? 0 : undefined }}>
                {/* Floating Sidebar Overlay - Hide for Preset Models */}
                {!isPreset && (
                    <div style={{
                        position: "absolute",
                        top: 100,
                        left: 24,
                        zIndex: 20,
                        width: 260,
                        background: "#fff",
                        borderRadius: 32,
                        color: "#000",
                        display: "flex",
                        flexDirection: "column",
                        padding: "24px 16px",
                        border: "3px solid #000",
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)"
                    }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                alignSelf: "flex-start",
                                marginBottom: 20,
                                background: "#fff",
                                color: "#000",
                                border: "2px solid #000",
                                borderRadius: 12,
                                padding: "8px 16px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: 800,
                                transition: "all 0.2s"
                            }}
                        >
                            ← {t.kids.steps.back}
                        </button>

                        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 20, paddingLeft: 8, letterSpacing: "-0.5px" }}>
                            BRICKERS
                        </h2>

                        <div style={{ marginBottom: 10, paddingLeft: 8, fontSize: "0.75rem", color: "#888", fontWeight: 800, textTransform: "uppercase" }}>
                            {t.kids.steps.viewModes}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <button
                                onClick={() => setActiveTab('LDR')}
                                style={{
                                    textAlign: "left",
                                    padding: "14px 16px",
                                    borderRadius: 16,
                                    background: activeTab === 'LDR' ? "#ffe135" : "transparent",
                                    color: "#000",
                                    fontWeight: 800,
                                    border: activeTab === 'LDR' ? "2px solid #000" : "2px solid transparent",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {t.kids.steps.tabBrick}
                            </button>
                            <button
                                onClick={() => setActiveTab('GLB')}
                                style={{
                                    textAlign: "left",
                                    padding: "14px 16px",
                                    borderRadius: 16,
                                    background: activeTab === 'GLB' ? "#ffe135" : "transparent",
                                    color: "#000",
                                    fontWeight: 800,
                                    border: "2px solid #000",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {t.kids.steps.tabModeling}
                            </button>
                        </div>

                        {/* 색상 변경 버튼 & 초기화 버튼 */}
                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            <button
                                onClick={() => setIsColorModalOpen(true)}
                                className="kidsStep__colorBtn"
                            >
                                색상 변경
                            </button>

                            {colorChangedLdrBase64 && (
                                <button
                                    onClick={restoreOriginalColor}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "10px 16px",
                                        borderRadius: 16,
                                        background: "transparent",
                                        color: "#888",
                                        fontWeight: 800,
                                        border: "2px solid transparent",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        fontSize: "0.85rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.color = "#000"}
                                    onMouseOut={(e) => e.currentTarget.style.color = "#888"}
                                >
                                    ↺ 원본으로 되돌리기
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #eee" }}>
                            <div style={{ marginBottom: 12, paddingLeft: 8, fontSize: "0.75rem", color: "#888", fontWeight: 800, textTransform: "uppercase" }}>
                                {t.kids.steps.registerGallery}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <input
                                    type="text"
                                    className="kidsStep__sidebarInput"
                                    placeholder={t.kids.steps.galleryModal.placeholder}
                                    value={galleryTitle}
                                    onChange={(e) => setGalleryTitle(e.target.value)}
                                />
                                <button
                                    className="kidsStep__sidebarBtn"
                                    onClick={handleRegisterGallery}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "..." : t.kids.steps.registerGallery}
                                </button>
                            </div>
                        </div>
                    </div>
                )}



                {/* Main 3D Card Area */}
                <div className="kidsStep__card">
                    {loading && (
                        <div style={{
                            position: "absolute", inset: 0, zIndex: 20,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.75)", fontWeight: 900,
                        }}>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                <span>{t.kids.steps.loading}</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'LDR' ? (
                        <>
                            <div style={{ position: "absolute", inset: 0 }}>
                                <Canvas camera={{ position: [200, -200, 200], fov: 45 }} dpr={[1, 2]}>
                                    <ambientLight intensity={0.9} />
                                    <directionalLight position={[3, 5, 2]} intensity={1} />
                                    <Center>
                                        <LdrModel
                                            url={ldrUrl}
                                            overrideMainLdrUrl={modelUrlToUse}
                                            onLoaded={(g) => { setLoading(false); modelGroupRef.current = g; }}
                                            onError={() => setLoading(false)}
                                            customBounds={modelBounds}
                                        />
                                    </Center>
                                    <OrbitControls makeDefault enablePan={false} enableZoom />
                                </Canvas>
                            </div>

                            {/* LDR Overlays (Start Button or Step Nav) */}
                            {isPreviewMode ? (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 40, pointerEvents: "none" }}>
                                    <button
                                        onClick={() => { setIsPreviewMode(false); setStepIdx(0); }}
                                        className="kidsStep__startNavBtn"
                                    >
                                        {t.kids.steps.startAssembly}
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    position: "absolute",
                                    bottom: 40,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 24,
                                    background: "#fff",
                                    padding: "8px 12px",
                                    borderRadius: 999,
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                                    border: "3px solid #000"
                                }}>
                                    <button
                                        className="kidsStep__navBtn"
                                        disabled={!canPrev}
                                        onClick={() => { setLoading(true); setStepIdx(v => v - 1); }}
                                        style={{ border: 'none', background: '#f0f0f0', borderRadius: 999, padding: "12px 24px", height: "auto", minWidth: "auto", boxShadow: "none" }}
                                    >
                                        ← {t.kids.steps.prev}
                                    </button>

                                    <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "sans-serif", padding: "0 8px" }}>
                                        Step {stepIdx + 1} <span style={{ color: "#aaa", fontSize: "0.9em" }}>/ {total}</span>
                                    </div>

                                    <button
                                        className="kidsStep__navBtn kidsStep__navBtn--next"
                                        disabled={!canNext}
                                        onClick={() => { setLoading(true); setStepIdx(v => v + 1); }}
                                        style={{ border: 'none', borderRadius: 999, padding: "12px 24px", height: "auto", minWidth: "auto", boxShadow: "none" }}
                                    >
                                        {t.kids.steps.next} →
                                    </button>
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
                            {!glbUrl && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontWeight: 700 }}>3D Model not available</div>}
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
                <div className="galleryModalOverlay" onClick={() => setIsColorModalOpen(false)}>
                    <div className="galleryModal colorModal" onClick={(e) => e.stopPropagation()}>
                        <button className="modalCloseBtn" onClick={() => setIsColorModalOpen(false)} aria-label="close">✕</button>
                        <h3 className="galleryModal__title">
                            🎨 {t.kids.steps.colorThemeTitle || "색상 테마 선택"}
                        </h3>

                        <div className="colorModal__themes">
                            {colorThemes.length === 0 ? (
                                <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                                    테마 로딩 중...
                                </div>
                            ) : (
                                colorThemes.map((theme: ThemeInfo) => (
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

                        <div className="galleryModal__actions">
                            <button
                                className="galleryModal__btn galleryModal__btn--cancel"
                                onClick={() => setIsColorModalOpen(false)}
                            >
                                {t.kids.steps.galleryModal.cancel}
                            </button>
                            <button
                                className="galleryModal__btn galleryModal__btn--confirm"
                                onClick={handleApplyColor}
                                disabled={!selectedTheme || isApplyingColor}
                            >
                                {isApplyingColor ? "..." : (t.kids.steps.apply || "적용하기")}
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

