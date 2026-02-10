'use client';

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LDrawLoader } from "three-stdlib";

const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

// 카메라를 쿼터뷰 각도로 설정하는 컴포넌트
function CameraSetup() {
    const { camera } = useThree();
    const initialized = useRef(false);

    useFrame(() => {
        if (!initialized.current) {
            // 쿼터뷰: 위에서 45도 각도로 내려다보기
            const distance = camera.position.length();
            const angle = Math.PI / 4; // 45도
            const height = distance * Math.sin(angle);
            const horizontal = distance * Math.cos(angle);

            camera.position.set(horizontal * 0.7, height, horizontal * 0.7);
            camera.lookAt(0, 0, 0);
            initialized.current = true;
        }
    });

    return null;
}

function LdrModel({ url }: { url: string }) {
    const { camera } = useThree();
    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        let cancelled = false;

        const manager = new THREE.LoadingManager();

        // URL modifier for LDraw path corrections
        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");

            // Normalize accidental double segments
            fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
            fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

                const lowerFixed = fixed.toLowerCase();
                if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
                    const filename = fixed.split("/").pop() || "";
                    const lowerName = filename.toLowerCase();
                    if (filename && lowerName !== filename) {
                        fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
                    }
                
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
            if (fixed.startsWith(CDN_BASE)) {
                return `/api/proxy/ldr?url=${encodeURIComponent(fixed)}`;
            }
            return fixed;
        });

        const loader = new LDrawLoader(manager);
        (loader as any).setPartsLibraryPath(CDN_BASE);

        // Load materials first, then load model
        (async () => {
            try {
                const proxyUrl = `/api/proxy/ldr?url=${encodeURIComponent(url)}`;
                console.log("Loading LDR via Proxy:", proxyUrl);

                await (loader as any).preloadMaterials(`${CDN_BASE}LDConfig.ldr`);
                if (cancelled) return;

                // Load main model via proxy to avoid CORS
                const g = await loader.loadAsync(proxyUrl);
                if (cancelled) return;

                g.rotation.x = Math.PI;
                setGroup(g);
            } catch (err) {
                console.error("LDraw load failed:", err);
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                alert(`Failed to load 3D model.\nURL: ${url}\nError: ${errorMessage}`);
            }
        })();

        return () => { cancelled = true; };
    }, [url]);

    if (!group) return null;

    return (
        <Bounds fit clip observe margin={1.2}>
            <Center>
                <primitive object={group} />
            </Center>
        </Bounds>
    );
}

export default function Preview3DModal({ url, onClose, buildUrl }: { url: string, onClose: () => void, buildUrl?: string }) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-[90vw] h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                    ✕ Close
                </button>

                <Canvas camera={{ position: [100, -150, 100], fov: 35 }}>
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[50, 100, 50]} intensity={1.2} />
                    <directionalLight position={[-50, 50, -50]} intensity={0.4} />
                    <CameraSetup />
                    <LdrModel url={url} />
                    <OrbitControls
                        makeDefault
                        autoRotate
                        autoRotateSpeed={1.5}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 2.5}
                    />
                </Canvas>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                    <div className="bg-white/90 px-6 py-3 rounded-full font-bold shadow-lg">
                        3D Preview Mode
                    </div>
                    {buildUrl && (
                        <button
                            onClick={() => router.push(buildUrl)}
                            className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                            Start Building
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
