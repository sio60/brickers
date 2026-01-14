// LdrViewer.tsx
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

type Props = {
  /** ex) "/ldraw/models/car.ldr" */
  url: string;
  /** default: "/ldraw/" (must contain LDConfig.ldr, parts/, p/) */
  partsLibraryPath?: string;
  /** default: "/ldraw/LDConfig.ldr" */
  ldconfigUrl?: string;
};

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (obj.geometry) obj.geometry.dispose?.();

    // material can be Material | Material[]
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
    else mat?.dispose?.();

    if (obj.texture) obj.texture.dispose?.();
  });
}

// ✅ gkjohnson's library is often used for three.js LDraw examples as it is a complete mirror
const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

function LdrModel({
  url,
  partsLibraryPath = CDN_BASE,
  ldconfigUrl = `${CDN_BASE}LDConfig.ldr`, // Note: Case sensitive on GitHub
}: Props) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    // ✅ IMPORTANT: LDraw refs often contain backslashes like "s\\xxxx.dat"
    manager.setURLModifier((u) => {
      let url = u.replace(/\\/g, "/");

      // 1. If using CDN and missing 'parts/' or 'p/', inject it based on heuristics
      if (
        url.includes("ldraw-parts-library") &&
        !url.includes("/parts/") &&
        !url.includes("/p/") &&
        !url.includes("LDConfig.ldr") // Don't touch config
      ) {
        if (url.endsWith(".dat")) {
          const filename = url.split("/").pop() || "";

          // Heuristic: 
          // Parts usually start with digits.
          // Primitives (p/) usually start with letters or '4-4' type patterns.
          // 's/' folder content is usually subparts found in 'parts/s/'? No, usually 'parts/s/' exists.

          // gkjohnson mirror structure:
          // /ldraw/parts/
          // /ldraw/p/

          const isPart = /^[0-9]/.test(filename);

          if (isPart) {
            url = url.replace("/ldraw/", "/ldraw/parts/");
          } else {
            // Assume primitive
            url = url.replace("/ldraw/", "/ldraw/p/");
          }
        }
      }

      return url;
    });

    manager.onError = (path) => {
      console.error("[LDraw] failed to load:", path);
    };

    const l = new LDrawLoader(manager);
    l.setPartsLibraryPath(partsLibraryPath);
    l.smoothNormals = true;

    // ✅ Conditional lines: pass the CLASS (constructor), not an instance
    // (types differ by three version, so cast to any to avoid TS red underline)
    try {
      (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any);
    } catch {
      // some three builds might not have this; safe to ignore
    }

    return l;
  }, [partsLibraryPath]);

  const [group, setGroup] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    let prev: THREE.Group | null = null;

    (async () => {
      setGroup(null);

      // ✅ preload materials (LDConfig)
      await loader.preloadMaterials(ldconfigUrl);

      const g = await loader.loadAsync(url);
      if (cancelled) {
        disposeObject3D(g);
        return;
      }

      // ✅ make outline lines softer (ONLY for lines)
      g.traverse((obj: any) => {
        // Fix rotation: LDraw is Y-down, Three.js is Y-up. 
        // Often LDraw models come in upside down relative to standard cameras.
        // We can rotate the whole group, but let's just create the group with rotation.
        // Actually, let's fix the object rotation here if needed, or better, in the <primitive> prop.

        const mat = obj.material;
        if (!mat) return;

        const tweak = (m: any) => {
          // Only make LINES transparent, not the bricks themselves
          if (m.isLineBasicMaterial) {
            m.transparent = true;
            m.opacity = 0.25;
            m.depthTest = true;
            m.needsUpdate = true;
          }
        };

        if (Array.isArray(mat)) mat.forEach(tweak);
        else tweak(mat);
      });

      // LDraw models generally need 180 deg rotation on X to be upright in Three.js default axes
      g.rotation.x = Math.PI;

      prev = g;
      setGroup(g);
    })().catch((e) => {
      console.error("[LDraw] load failed:", e);
    });

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

export default function LdrViewer(props: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "70vh",
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Canvas camera={{ position: [0, 150, 300], fov: 45 }}>
        <color attach="background" args={["#ffffff"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[200, 300, 200]} intensity={1.1} />

        <LdrModel {...props} />

        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}
