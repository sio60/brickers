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
        let cancelled = false;

        const manager = new THREE.LoadingManager();

        // URL modifier for LDraw path corrections
        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");

            if (fixed.includes("ldraw-parts-library") && fixed.endsWith(".dat") && !fixed.includes("LDConfig.ldr")) {
                const filename = fixed.split("/").pop() || "";
                const isPrimitive = /^\d+-\d+/.test(filename) ||
                    /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);
                const isSubpart = /^\d+s\d+\.dat$/i.test(filename);

                // Fix incorrect path combinations
                fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
                fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

                if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
                    fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
                }
                if (isSubpart && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
                    fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
                }
                if (!fixed.includes("/parts/") && !fixed.includes("/p/")) {
                    if (isSubpart) fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
                    else if (isPrimitive) fixed = fixed.replace("/ldraw/", "/ldraw/p/");
                    else fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
                }
            }
            return fixed;
        });

        const loader = new LDrawLoader(manager);
        (loader as any).setPartsLibraryPath(CDN_BASE);

        // Load materials first, then load model
        (async () => {
            try {
                await (loader as any).preloadMaterials(`${CDN_BASE}LDConfig.ldr`);
                if (cancelled) return;

                const g = await loader.loadAsync(url);
                if (cancelled) return;

                g.rotation.x = Math.PI;
                setGroup(g);
            } catch (err) {
                console.error("LDraw load failed", err);
            }
        })();

        return () => { cancelled = true; };
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
