'use client';

import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

type Props = {
    url: string;
};

// GLB Loading Component
function GlbModel({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return (
        <Bounds fit clip observe margin={1.2}>
            <primitive object={scene} />
        </Bounds>
    );
}

// Main Viewer Component
export default function KidsGlbViewer({ url }: Props) {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                camera={{ position: [5, 5, 5], fov: 45 }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={1.0} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <directionalLight position={[-5, 5, 5]} intensity={0.5} />

                <Suspense fallback={null}>
                    <GlbModel url={url} />
                </Suspense>

                <OrbitControls
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
