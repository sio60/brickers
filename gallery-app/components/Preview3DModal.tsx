'use client';

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { LDrawLoader } from "three-stdlib";

const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

function LdrModel({ url }: { url: string }) {
    const { scene, camera } = useThree();
    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        const loader = new LDrawLoader();
        (loader as any).setPartsLibraryPath(CDN_BASE);

        // Optimize materials?
        // loader.smoothNormals = true; 

        loader.load(url, (g) => {
            // Adjust visualization
            // Remove huge origin offset if any? Center wrapper handles it.
            // Rotate to be upright if needed (LDraw Y is often up or down depending on perspective)
            // Usually LDraw is Y-up but sometimes needs rotation.
            // KidsStepPage uses g.rotation.x = Math.PI;
            g.rotation.x = Math.PI;
            setGroup(g);
        }, undefined, (err) => {
            console.error("LDraw load failed", err);
        });

    }, [url]);

    if (!group) return null;

    return (
        <Bounds fit clip observe margin={1.2}>
            <primitive object={group} />
        </Bounds>
    );
}

export default function Preview3DModal({ url, onClose }: { url: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-[90vw] h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                    ✕ Close
                </button>

                <Canvas camera={{ position: [50, 50, 50], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[10, 20, 10]} intensity={1} />
                    <LdrModel url={url} />
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={2} />
                </Canvas>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-3 rounded-full font-bold shadow-lg">
                    3D Preview Mode
                </div>
            </div>
        </div>
    );
}
