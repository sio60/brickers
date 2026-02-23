'use client';

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import GlbModel from "@/components/three/GlbModel";

type Props = {
    url: string;
};

// Main Viewer Component
export default function KidsGlbViewer({ url }: Props) {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }}
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
