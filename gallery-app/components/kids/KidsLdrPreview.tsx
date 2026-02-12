'use client';

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import * as THREE from "three";
import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";

/* ── Monkey-patch: null children을 원천 차단 ── */
const _origAdd = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...objects: THREE.Object3D[]) {
    return _origAdd.apply(this, objects.filter(o => o != null));
};

type Props = {
    url: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    stepMode?: boolean;
    onLoaded?: () => void;
    onError?: (err: any) => void;
    autoRotate?: boolean;
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
    const { invalidate, camera, controls } = useThree();

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier());
        manager.onError = (path) => console.error("[LDraw] failed to load asset:", path);

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

        (async () => {
            try {
                setGroup(null);

                // 1. LDR 텍스트 가져오기
                const res = await fetch(url);
                const text = await res.text();

                // 2. Worker로 정렬된 텍스트 생성
                const workerResult = await new Promise<{ stepTexts: string[]; sortedFullText: string }>((resolve, reject) => {
                    const worker = new Worker(new URL('@/lib/ldrWorker.ts', import.meta.url));
                    worker.postMessage({ type: 'PROCESS_LDR', text });
                    worker.onmessage = (e) => {
                        if (e.data.type === 'SUCCESS') {
                            resolve(e.data.payload);
                        } else {
                            reject(new Error(e.data.payload));
                        }
                        worker.terminate();
                    };
                    worker.onerror = (err) => {
                        reject(err);
                        worker.terminate();
                    };
                });

                if (cancelled) return;
                if (onStepCountChange) onStepCountChange(workerResult.stepTexts.length);

                // 3. 정렬된 LDR 텍스트를 Blob URL로 변환하여 LDrawLoader에 로드
                const sortedBlob = new Blob([workerResult.sortedFullText], { type: 'text/plain' });
                const sortedUrl = URL.createObjectURL(sortedBlob);

                await loader.preloadMaterials(ldconfigUrl);
                const g = await loader.loadAsync(sortedUrl);
                URL.revokeObjectURL(sortedUrl);

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
                    camera.position.set(0, targetY + size.y * 0.3, Math.max(size.x, size.z) * 2.5);
                    camera.lookAt(0, targetY, 0);
                }

                prev = g;
                setGroup(g);
                invalidate();
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
    }, [url, ldconfigUrl, loader, onStepCountChange, onLoaded, onError, camera, controls, invalidate]);

    // 원본 머티리얼 저장 (투명화 후 복원용)
    const originalMaterialsRef = useRef<Map<number, THREE.Material | THREE.Material[]>>(new Map());

    useEffect(() => {
        if (!group || !stepMode) return;

        // 원본 머티리얼 백업 (최초 1회)
        if (originalMaterialsRef.current.size === 0) {
            group.children.forEach((child) => {
                child.traverse((obj: any) => {
                    if (obj.isMesh && obj.material) {
                        if (!originalMaterialsRef.current.has(obj.id)) {
                            originalMaterialsRef.current.set(
                                obj.id,
                                Array.isArray(obj.material)
                                    ? obj.material.map((m: THREE.Material) => m.clone())
                                    : obj.material.clone()
                            );
                        }
                    }
                });
            });
        }

        if (isPreview) {
            // 프리뷰 모드: 모든 파트 보이고, 원래 머티리얼 복원
            group.children.forEach((child) => {
                child.visible = true;
                child.traverse((obj: any) => {
                    if (obj.isMesh && originalMaterialsRef.current.has(obj.id)) {
                        const orig = originalMaterialsRef.current.get(obj.id)!;
                        obj.material = Array.isArray(orig)
                            ? orig.map((m: THREE.Material) => m.clone())
                            : orig.clone();
                    }
                });
            });
            return;
        }

        // startingBuildingStep 기반으로 스텝 그룹 생성
        const stepGroups: THREE.Object3D[][] = [[]];
        group.children.forEach((child) => {
            if ((child as any).userData?.startingBuildingStep && stepGroups[stepGroups.length - 1].length > 0) {
                stepGroups.push([]);
            }
            stepGroups[stepGroups.length - 1].push(child);
        });

        // 현재 스텝에 해당하는 children 집합 계산
        const currentStepChildren = new Set<THREE.Object3D>(stepGroups[currentStep - 1] || []);
        const previousStepChildren = new Set<THREE.Object3D>();
        for (let i = 0; i < currentStep - 1; i++) {
            (stepGroups[i] || []).forEach(c => previousStepChildren.add(c));
        }

        group.children.forEach((child) => {
            const isCurrent = currentStepChildren.has(child);
            const isPrevious = previousStepChildren.has(child);

            child.visible = isCurrent || isPrevious;

            child.traverse((obj: any) => {
                if (!obj.isMesh) return;

                if (isCurrent) {
                    // 현재 스텝: 원본 머티리얼 복원
                    if (originalMaterialsRef.current.has(obj.id)) {
                        const orig = originalMaterialsRef.current.get(obj.id)!;
                        obj.material = Array.isArray(orig)
                            ? orig.map((m: THREE.Material) => m.clone())
                            : orig.clone();
                    }
                } else if (isPrevious) {
                    // 이전 스텝: 투명 머티리얼 적용
                    const makeTrans = (mat: THREE.Material): THREE.Material => {
                        const m = mat.clone();
                        m.transparent = true;
                        m.opacity = 0.15;
                        m.depthWrite = false;
                        return m;
                    };
                    if (Array.isArray(obj.material)) {
                        obj.material = obj.material.map(makeTrans);
                    } else {
                        obj.material = makeTrans(obj.material);
                    }
                }
            });
        });
    }, [group, currentStep, stepMode, isPreview]);

    if (!group) return null;

    return <primitive object={group} />;
}

export type KidsLdrPreviewHandle = {
    captureAllSteps: () => Promise<string[][]>;
    captureScreenshot: () => string | null;
};

const KidsLdrPreview = forwardRef<KidsLdrPreviewHandle, Props>(({ url, partsLibraryPath, ldconfigUrl, stepMode = false, autoRotate = true }, ref) => {
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
        },
        captureScreenshot: () => {
            if (!canvasRef.current) return null;
            return canvasRef.current.toDataURL("image/png");
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
                    pointerEvents: "none",
                }}>
                    <div style={{ textAlign: "center", color: "#666", fontWeight: "bold" }}
                        dangerouslySetInnerHTML={{ __html: t.viewer3d?.loadingWait || t.common.loading }}
                    />
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
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.viewer3d?.loadError || 'Model loading failed'}</div>
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
                camera={{ position: [120, -120, 500], fov: 45 }}
                shadows
                dpr={[1, 2]}
                gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
                onCreated={({ gl }) => {
                    gl.setClearColor(0x000000, 0); // Transparent background
                }}
            >
                <ThrottledDriver />
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
                    autoRotate={autoRotate}
                    autoRotateSpeed={2}
                />
            </Canvas>
        </div >
    );
});

export default KidsLdrPreview;
