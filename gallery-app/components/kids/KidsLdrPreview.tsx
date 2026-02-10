'use client';

import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const CDN_BASE =
    "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

type Props = {
    url: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    stepMode?: boolean;
    onLoaded?: () => void;
    onError?: (err: any) => void;
};

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
    stepMode = false,
    currentStep = 1,
    isPreview = false,
    onStepCountChange,
    onLoaded,
    onError,
}: Props & { currentStep?: number; isPreview?: boolean; onStepCountChange?: (count: number) => void }) {
    const loader = useMemo(() => {
        THREE.Cache.enabled = true;

        const manager = new THREE.LoadingManager();

        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");

            // Normalize accidental double segments
            fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
            fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

            // LDraw 라이브러리 URL인 경우 경로 수정
            const lowerFixed = fixed.toLowerCase();
            if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
                const filename = fixed.split("/").pop() || "";
                const lowerName = filename.toLowerCase();
                if (filename && lowerName !== filename) {
                    fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
                }


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

            if (fixed.startsWith(CDN_BASE)) {
                return `/api/proxy/ldr?url=${encodeURIComponent(fixed)}`;
            }
            return fixed;
        });

        manager.onError = (path) => console.error("[LDraw] failed to load asset:", path);

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = true;

        try {
            (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any);
        } catch { }

        return l;
    }, [partsLibraryPath]);

    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        let cancelled = false;
        let prev: THREE.Group | null = null;

        (async () => {
            try {
                setGroup(null);

                await loader.preloadMaterials(ldconfigUrl);
                const g = await loader.loadAsync(url);

                if (cancelled) {
                    disposeObject3D(g);
                    return;
                }

                g.rotation.x = Math.PI;

                // 층(Layer) 정보 계산: Y 좌표(높이) 기준
                const layerSet = new Set<number>();
                g.children.forEach(child => {
                    layerSet.add(Math.round(child.position.y * 10) / 10);
                });

                const sortedLayers = Array.from(layerSet).sort((a, b) => a - b);

                if (onStepCountChange) {
                    onStepCountChange(sortedLayers.length);
                }

                prev = g;
                setGroup(g);
                onLoaded?.();
            } catch (e) {
                console.error("[LdrModel] Failed to load LDR:", e);
                onError?.(e);
            }
        })();

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [url, ldconfigUrl, loader, onStepCountChange, onLoaded, onError]);

    useEffect(() => {
        if (!group || !stepMode) return;

        if (isPreview) {
            // 프리뷰 모드일 때는 모든 파트 보임
            group.children.forEach((child) => {
                child.visible = true;
            });
            return;
        }

        const layerSet = new Set<number>();
        group.children.forEach(child => {
            layerSet.add(Math.round(child.position.y * 10) / 10);
        });
        const sortedLayers = Array.from(layerSet).sort((a, b) => a - b);
        const currentLayerY = sortedLayers[currentStep - 1];

        group.children.forEach((child) => {
            const childY = Math.round(child.position.y * 10) / 10;
            child.visible = childY <= currentLayerY;
        });
    }, [group, currentStep, stepMode, isPreview]);

    if (!group) return null;

    return (
        <Bounds fit clip observe margin={1.2}>
            <Center>
                <primitive object={group} />
            </Center>
        </Bounds>
    );
}

export type KidsLdrPreviewHandle = {
    captureAllSteps: () => Promise<string[][]>;
};

const KidsLdrPreview = forwardRef<KidsLdrPreviewHandle, Props>(({ url, partsLibraryPath, ldconfigUrl, stepMode = false }, ref) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [totalSteps, setTotalSteps] = useState(1);
    const [isPreview, setIsPreview] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const groupRef = useRef<THREE.Group | null>(null);
    const controlsRef = useRef<any>(null); // OrbitControls ref

    // 캡처를 위한 상태 (렌더링 동기화용)
    const renderTrigger = useRef<(() => void) | null>(null);

    useImperativeHandle(ref, () => ({
        captureAllSteps: async () => {
            if (!groupRef.current || !canvasRef.current || !controlsRef.current) return [];

            console.log("📸 Starting Capture Sequence...");
            const stepsImages: string[][] = [];

            // 1. 프리뷰 모드 해제 및 초기화
            setIsPreview(false);

            // 캡처 중엔 배경 투명보다는 흰색이 나을 수 있음 (선택사항)
            // 여기서는 그대로 진행

            const originalStep = currentStep;

            for (let step = 1; step <= totalSteps; step++) {
                setCurrentStep(step);

                // Step 변경 후 렌더링 반영 대기 (간단히 시간 지연)
                await new Promise(r => setTimeout(r, 100));

                const stepImgs: string[] = [];

                // 3 Views: Main, Top/Left, Back
                // 카메라 위치 정의 (x, y, z)
                const views = [
                    [150, 150, 150],    // View 1: Main Quarter
                    [-100, 200, 100],   // View 2: Top Left
                    [-150, 50, -150]    // View 3: Back Low
                ];

                for (const [vx, vy, vz] of views) {
                    // 카메라 이동
                    controlsRef.current.object.position.set(vx, vy, vz);
                    controlsRef.current.object.lookAt(0, 0, 0);
                    controlsRef.current.update();

                    // 렌더링 대기
                    await new Promise(r => setTimeout(r, 50));

                    // 캡처
                    const dataUrl = canvasRef.current.toDataURL("image/png");
                    stepImgs.push(dataUrl);
                }
                stepsImages.push(stepImgs);
            }

            // 복귀
            setCurrentStep(originalStep);
            console.log(`✅ Captured ${stepsImages.length} steps.`);
            return stepsImages;
        }
    }));

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const startAssembly = () => {
        setIsPreview(false);
        setCurrentStep(1);
    };

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>

            {loading && !errorMSG && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(248,249,250,0.8)",
                    zIndex: 10,
                }}>
                    <div style={{ textAlign: "center", color: "#666", fontWeight: "bold" }}>
                        3D 모델 불러오는 중...<br />
                        <span style={{ fontSize: "0.8em", fontWeight: "normal" }}>잠시만 기다려주세요</span>
                    </div>
                </div>
            )}

            {errorMSG && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,240,240,0.9)",
                    zIndex: 20,
                }}>
                    <div style={{ textAlign: "center", color: "#d32f2f" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>모델 로딩 실패</div>
                        <div style={{ fontSize: "0.8em" }}>{errorMSG}</div>
                    </div>
                </div>
            )}

            {stepMode && !loading && !errorMSG && (
                <>
                    {isPreview ? (
                        <div style={{
                            position: "absolute",
                            bottom: "40px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                        }}>
                            <button
                                onClick={startAssembly}
                                style={{
                                    background: "#ffe135",
                                    color: "#000",
                                    border: "3px solid #000",
                                    padding: "16px 40px",
                                    borderRadius: "50px",
                                    fontSize: "1.2rem",
                                    fontWeight: "900",
                                    cursor: "pointer",
                                    boxShadow: "0 8px 0px rgba(0,0,0,0.15)",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 10px 0px rgba(0,0,0,0.15)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 8px 0px rgba(0,0,0,0.15)";
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = "translateY(2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 0px rgba(0,0,0,0.15)";
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                            >
                                {t.kids?.steps?.startAssembly || "조립 시작하기"}
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            position: "absolute",
                            bottom: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            background: "rgba(255,255,255,0.9)",
                            padding: "12px 24px",
                            borderRadius: "50px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            border: "2px solid #000"
                        }}>
                            <button
                                onClick={handlePrev}
                                disabled={currentStep === 1}
                                style={{
                                    background: currentStep === 1 ? "#e0e0e0" : "#fff",
                                    color: currentStep === 1 ? "#999" : "#000",
                                    border: "2px solid #000",
                                    padding: "10px 20px",
                                    borderRadius: "25px",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    cursor: currentStep === 1 ? "not-allowed" : "pointer",
                                    opacity: currentStep === 1 ? 0.6 : 1,
                                    minWidth: "100px"
                                }}
                            >
                                ← PREV
                            </button>

                            <div style={{ fontSize: "16px", fontWeight: "800", minWidth: "100px", textAlign: "center" }}>
                                Step {currentStep} <span style={{ color: "#888", fontWeight: "normal" }}>/ {totalSteps}</span>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={currentStep >= totalSteps}
                                style={{
                                    background: currentStep >= totalSteps ? "#e0e0e0" : "#000",
                                    color: currentStep >= totalSteps ? "#999" : "#fff",
                                    border: "2px solid #000",
                                    padding: "10px 20px",
                                    borderRadius: "25px",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    cursor: currentStep >= totalSteps ? "not-allowed" : "pointer",
                                    opacity: currentStep >= totalSteps ? 0.6 : 1,
                                    minWidth: "100px"
                                }}
                            >
                                NEXT →
                            </button>
                        </div>
                    )}
                </>
            )
            }

            <Canvas
                ref={canvasRef}
                camera={{ position: [0, 80, 500], fov: 45 }}
                dpr={[1, 2]}
                gl={{ alpha: true, preserveDrawingBuffer: true }} // 캡처를 위해 preserveDrawingBuffer 필수
            >
                <ambientLight intensity={1.2} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} />
                <directionalLight position={[-10, -20, -10]} intensity={0.8} />

                <group ref={groupRef}>
                    <LdrModel
                        url={url}
                        partsLibraryPath={partsLibraryPath}
                        ldconfigUrl={ldconfigUrl}
                        stepMode={stepMode}
                        currentStep={currentStep}
                        isPreview={isPreview}
                        onStepCountChange={setTotalSteps}
                        onLoaded={() => setLoading(false)}
                        onError={(e) => {
                            setLoading(false);
                            setErrorMSG(e?.message || "Unknown error");
                        }}
                    />
                </group>

                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enablePan={false}
                    enableZoom
                    minDistance={10}
                    maxDistance={1000}
                    autoRotate={true}
                    autoRotateSpeed={2}
                />
            </Canvas>
        </div >
    );
});

export default KidsLdrPreview;
