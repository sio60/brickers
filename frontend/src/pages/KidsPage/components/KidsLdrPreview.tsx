// KidsLdrPreview.tsx
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const CDN_BASE =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

type Props = {
  url: string;
  partsLibraryPath?: string;
  ldconfigUrl?: string;
  stepMode?: boolean; // ✅ Step mode flag
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
}: Props & { currentStep?: number; onStepCountChange?: (count: number) => void }) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    manager.setURLModifier((u) => {
      let fixed = u.replace(/\\/g, "/");

      if (
        fixed.includes("ldraw-parts-library") &&
        !fixed.includes("/parts/") &&
        !fixed.includes("/p/") &&
        !fixed.includes("LDConfig.ldr")
      ) {
        if (fixed.endsWith(".dat")) {
          const filename = fixed.split("/").pop() || "";
          const isPart = /^[0-9]/.test(filename);
          fixed = fixed.replace(
            "/ldraw/",
            isPart ? "/ldraw/parts/" : "/ldraw/p/"
          );
        }
      }

      return fixed;
    });

    manager.onError = (path) => console.error("[LDraw] failed to load:", path);

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
      setGroup(null);

      await loader.preloadMaterials(ldconfigUrl);
      const g = await loader.loadAsync(url);

      if (cancelled) {
        disposeObject3D(g);
        return;
      }

      g.rotation.x = Math.PI;

      // Group children might represent steps or parts.
      // Typically, LDrawLoader puts everything in one group, or nested groups.
      // If we assume a flat list of parts for simplicity in "fake step mode":
      if (onStepCountChange) {
        // If specific step groups exist, count them. Otherwise count basic children (parts).
        // LDrawLoader usually puts steps in "userData.numSteps"? No standard.
        // Let's just treat total children as total "parts" to show one by one if we want animation,
        // but for "Steps", LDraw often groups them.
        // For now, let's just expose the total children count as max steps.
        onStepCountChange(g.children.length);
      }

      prev = g;
      setGroup(g);
    })().catch((e) => console.error("[LDraw] load failed:", e));

    return () => {
      cancelled = true;
      if (prev) disposeObject3D(prev);
    };
  }, [url, ldconfigUrl, loader, onStepCountChange]);

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
  const [loading, setLoading] = useState(true);
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

      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(248,249,250,0.9)",
          zIndex: 10,
        }}>
          <div style={{ textAlign: "center", color: "#666" }}>
            3D 로딩 중...
          </div>
        </div>
      )}

      {stepMode && !loading && (
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
            &lt; PREV
          </button>

          <div style={{ fontSize: "16px", fontWeight: "800", minWidth: "80px", textAlign: "center" }}>
            Step {currentStep} <span style={{ color: "#888", fontWeight: "normal" }}>/ {totalSteps}</span>
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
            NEXT -&gt;
          </button>
        </div>
      )}

      <Canvas
        camera={{ position: [200, 0, 200], fov: 45 }}
        dpr={[1, 2]}
        onCreated={() => setLoading(false)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 2]} intensity={1.0} />

        <LdrModel
          url={url}
          partsLibraryPath={partsLibraryPath}
          ldconfigUrl={ldconfigUrl}
          stepMode={stepMode}
          currentStep={currentStep}
          onStepCountChange={setTotalSteps}
        />

        <OrbitControls makeDefault enablePan={false} enableZoom />
      </Canvas>
    </div>
  );
}
