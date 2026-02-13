'use client';

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import * as THREE from "three";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LDrawLoader } from "three-stdlib";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";

function LdrModel({ url }: { url: string }) {
    const { invalidate, camera, controls } = useThree();
    const [group, setGroup] = useState<THREE.Group | null>(null);

    useEffect(() => {
        let cancelled = false;

        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier());

        const loader = new LDrawLoader(manager);
        (loader as any).setPartsLibraryPath(CDN_BASE);

        (async () => {
            try {
                const proxyUrl = `/api/proxy/ldr?url=${encodeURIComponent(url)}`;

                await (loader as any).preloadMaterials(`${CDN_BASE}LDConfig.ldr`);
                if (cancelled) return;

                const g = await loader.loadAsync(proxyUrl);
                if (cancelled) return;

                g.rotation.x = Math.PI;

                // 모델 중심 정렬 (BrickJudgeViewer 패턴)
                const box = new THREE.Box3().setFromObject(g);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                g.position.set(-center.x, -box.min.y, -center.z);

                // 카메라를 모델 기준으로 배치
                const targetY = size.y / 2;
                if (controls && (controls as any).target) {
                    (controls as any).target.set(0, targetY, 0);
                    (controls as any).update();
                }
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(0, targetY + size.y * 0.3, maxDim * 2.5);
                camera.lookAt(0, targetY, 0);

                setGroup(g);
                invalidate();
            } catch (err) {
                console.error("LDraw load failed:", err);
            }
        })();

        return () => { cancelled = true; };
    }, [url, camera, controls, invalidate]);

    if (!group) return null;
    return <primitive object={group} />;
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

                <Canvas camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }} frameloop="demand">
                    <ThrottledDriver />
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[50, 100, 50]} intensity={1.2} />
                    <directionalLight position={[-50, 50, -50]} intensity={0.4} />
                    <LdrModel url={url} />
                    <OrbitControls
                        makeDefault
                        autoRotate
                        autoRotateSpeed={1.5}
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
