import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

// ✅ gkjohnson CDN (LdrViewer와 동일)
const CDN_BASE =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

type Props = {
  url: string;
  partsLibraryPath?: string;
  ldconfigUrl?: string;
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
}: Props) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    manager.setURLModifier((u) => {
      let fixed = u.replace(/\\/g, "/");

      // CDN 쓸 때 parts/p 폴더 보정
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

      // LDraw -> Three 축 보정
      g.rotation.x = Math.PI;

      prev = g;
      setGroup(g);
    })().catch((e) => console.error("[LDraw] load failed:", e));

    return () => {
      cancelled = true;
      if (prev) disposeObject3D(prev);
    };
  }, [url, ldconfigUrl, loader]);

  if (!group) return null;

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={group} />
    </Bounds>
  );
}

export default function KidsLdrPreview({
  url,
  partsLibraryPath,
  ldconfigUrl,
}: Props) {
  const [loading, setLoading] = useState(true);

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
            <div style={{
              width: 32,
              height: 32,
              border: "3px solid #ddd",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 8px",
            }} />
            3D 로딩 중...
          </div>
        </div>
      )}
      <Canvas
        camera={{ position: [200, 100, 200], fov: 45 }}
        dpr={[1, 2]}
        onCreated={() => setLoading(false)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 2]} intensity={1.0} />

        <LdrModel
          url={url}
          partsLibraryPath={partsLibraryPath}
          ldconfigUrl={ldconfigUrl}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          autoRotate
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}
