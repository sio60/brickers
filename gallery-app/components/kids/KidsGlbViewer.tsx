'use client';

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
    url: string;
};

// GLB 모델 중심 정렬 컴포넌트 (BrickJudgeViewer 패턴)
function GlbModel({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    const { invalidate, camera, controls } = useThree();
    const centered = useRef(false);

    useEffect(() => {
        if (!scene || centered.current) return;

        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        scene.position.set(-center.x, -box.min.y, -center.z);

        const targetY = size.y / 2;
        if (controls && (controls as any).target) {
            (controls as any).target.set(0, targetY, 0);
            (controls as any).update();
        }
        camera.position.set(0, targetY + size.y * 0.3, Math.max(size.x, size.z) * 2.5);
        camera.lookAt(0, targetY, 0);

        centered.current = true;
        invalidate();
    }, [scene, camera, controls, invalidate]);

    return <primitive object={scene} />;
}

// Main Viewer Component
export default function KidsGlbViewer({ url }: Props) {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                camera={{ position: [0, 200, 600], fov: 45 }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={1.0} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <directionalLight position={[-5, 5, 5]} intensity={0.5} />

                <Suspense fallback={null}>
                    <GlbModel url={url} />
                </Suspense>

                <OrbitControls
                    makeDefault
                    enablePan={false}
                    enableZoom={true}
                    autoRotate
                    autoRotateSpeed={1.5}
                />
            </Canvas>

            {/* Overlay to indicate this is a 3D model */}
            <div style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                background: "rgba(0,0,0,0.5)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                pointerEvents: "none"
            }}>
                3D Viewer
            </div>
        </div>
    );
}
