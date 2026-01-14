import { Canvas, useLoader } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect } from "react";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";

type Props = {
  url: string; // ex) "/ldraw/models/car.ldr"
};

/**
 * LDraw(.ldr/.dat) -> Three.js Group 로드 + 자동 카메라 fit
 * 요구사항:
 * public/ldraw/
 *  - LDConfig.ldr
 *  - parts/
 *  - p/
 *  - models/car.ldr
 */
function LdrModel({ url }: Props) {
  // ✅ 어떤 파트(.dat)가 로드 실패하는지 콘솔에 찍기
  useEffect(() => {
    const mgr = THREE.DefaultLoadingManager;
    const prevOnError = mgr.onError;

    mgr.onError = (path) => {
      console.error("[LDraw] failed to load:", path);
    };

    return () => {
      mgr.onError = prevOnError;
    };
  }, []);

  const group = useLoader(LDrawLoader as any, url, (loader: any) => {
    loader.setPartsLibraryPath("/ldraw/");
    loader.preloadMaterials("/ldraw/LDConfig.ldr");
    loader.smoothNormals = true;

    // ✅ 최신 three에서 필수: "인스턴스"가 아니라 "생성자(클래스)"를 넣어야 함
    loader.setConditionalLineMaterial(THREE.LineBasicMaterial);
  });

  // ✅ 로드 후 라인(윤곽) 머티리얼이 너무 진하면 살짝 낮춤
  useEffect(() => {
    group.traverse((obj: any) => {
      const mat = obj.material;
      if (!mat) return;

      if (mat instanceof THREE.LineBasicMaterial) {
        mat.transparent = true;
        mat.opacity = 0.25;
        mat.depthTest = true;
        mat.needsUpdate = true;
      }
    });
  }, [group]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={group} />
    </Bounds>
  );
}

export default function LdrViewer({ url }: Props) {
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

        <LdrModel url={url} />

        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}
