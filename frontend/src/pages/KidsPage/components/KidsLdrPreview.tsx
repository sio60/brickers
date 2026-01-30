// KidsLdrPreview.tsx
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const CDN_BASE =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

type Props = {
  url: string;
  partsLibraryPath?: string;
  ldconfigUrl?: string;
  stepMode?: boolean; // ✅ Step mode flag
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
  onStepCountChange,
  onLoaded,
  onError,
}: Props & { currentStep?: number; onStepCountChange?: (count: number) => void }) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    manager.setURLModifier((u) => {
      let fixed = u.replace(/\\/g, "/");

      // LDraw 라이브러리 URL인 경우만 처리
      if (fixed.includes("ldraw-parts-library") && fixed.endsWith(".dat") && !fixed.includes("LDConfig.ldr")) {
        const filename = fixed.split("/").pop() || "";

        // Primitive 패턴: n-n*.dat (예: 4-4edge, 1-4cyli, 3-4edge), stud*.dat, rect*.dat 등
        const isPrimitive = /^\d+-\d+/.test(filename) ||
                            /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);

        // Subpart 패턴: 파트번호 + s + 숫자.dat (예: 3003s02.dat, 3005s01.dat)
        const isSubpart = /^\d+s\d+\.dat$/i.test(filename);

        // 잘못된 경로 조합 수정
        // LDrawLoader가 여러 경로를 시도하면서 생기는 문제들
        fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");  // /models/p/ → /p/
        fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");  // /models/parts/ → /parts/
        fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
        fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
        fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");

        // primitive가 /parts/에 잘못 들어간 경우 수정
        if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
          fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
        }

        // subpart가 /p/에 잘못 들어간 경우 수정
        if (isSubpart && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
          fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
        }

        // 이미 올바른 경로가 있으면 그대로 사용
        if (fixed.includes("/parts/") || fixed.includes("/p/")) {
          return fixed;
        }

        // 경로가 없는 경우 적절한 경로 추가
        if (isSubpart) {
          fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
        } else if (isPrimitive) {
          fixed = fixed.replace("/ldraw/", "/ldraw/p/");
        } else {
          fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
        }
      }

      return fixed;
    });

    manager.onError = (path) => console.error("[LDraw] failed to load asset:", path);
    // manager.onProgress = (url, loaded, total) => console.log(`[LDraw] Loading... ${(loaded / total * 100).toFixed(0)}%`);

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
        console.log("[LdrModel] Loading LDR from:", url);

        await loader.preloadMaterials(ldconfigUrl);
        const g = await loader.loadAsync(url);

        if (cancelled) {
          disposeObject3D(g);
          return;
        }

        console.log("[LdrModel] Loaded successfully. Children:", g.children.length);
        g.rotation.x = Math.PI;

        if (onStepCountChange) {
          onStepCountChange(g.children.length);
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

  // Handle visibility for steps
  useEffect(() => {
    if (!group || !stepMode) return;
    group.children.forEach((child, index) => {
      child.visible = index < currentStep;
    });
  }, [group, currentStep, stepMode]);

  if (!group) return null;

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={group} />
    </Bounds>
  );
}

export default function KidsLdrPreview({ url, partsLibraryPath, ldconfigUrl, stepMode = false }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);

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
            {t.ldrPreview?.loading || "Loading 3D model..."}<br />
            <span style={{ fontSize: "0.8em", fontWeight: "normal" }}>{t.ldrPreview?.pleaseWait || "Please wait"}</span>
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
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t.ldrPreview?.loadFailed || "Failed to load model"}</div>
            <div style={{ fontSize: "0.8em" }}>{errorMSG}</div>
          </div>
        </div>
      )}

      {stepMode && !loading && !errorMSG && (
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
              background: "none", border: "none", fontSize: "18px", fontWeight: "bold", cursor: "pointer",
              opacity: currentStep === 1 ? 0.3 : 1
            }}
          >
            &lt; {t.ldrPreview?.prev || "PREV"}
          </button>

          <div style={{ fontSize: "16px", fontWeight: "800", minWidth: "80px", textAlign: "center" }}>
            {t.ldrPreview?.step || "Step"} {currentStep} <span style={{ color: "#888", fontWeight: "normal" }}>/ {totalSteps}</span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep >= totalSteps}
            style={{
              background: "#000", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "20px",
              fontSize: "14px", fontWeight: "bold", cursor: "pointer",
              opacity: currentStep >= totalSteps ? 0.5 : 1
            }}
          >
            {t.ldrPreview?.next || "NEXT"} -&gt;
          </button>
        </div>
      )}

      <Canvas
        camera={{ position: [200, 200, 200], fov: 45 }}
        dpr={[1, 2]}
        // Canvas 생성 그 자체가 아니라, 모델 로딩 완료 시 setLoading(false)
        onCreated={() => {
          // Canvas ready
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <directionalLight position={[-10, -20, -10]} intensity={0.5} />

        <LdrModel
          url={url}
          partsLibraryPath={partsLibraryPath}
          ldconfigUrl={ldconfigUrl}
          stepMode={stepMode}
          currentStep={currentStep}
          onStepCountChange={setTotalSteps}
          onLoaded={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            setErrorMSG(e?.message || "Unknown error");
          }}
        />

        <OrbitControls makeDefault enablePan={false} enableZoom minDistance={10} maxDistance={1000} />
      </Canvas>
    </div>
  );
}
