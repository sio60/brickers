'use client';

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { usePerformanceStore } from "@/stores/performanceStore";
import { scheduleIdleWork, cancelIdleWork } from "@/lib/idleScheduler";
import LdrModel from "./LdrModel";

// =============================================================================
// Offscreen Brick Renderer Strategy
// =============================================================================
// WebGL Context limit issue (max 8~16) prevents rendering many small Canvases.
// Solution: Use ONE offscreen Canvas to render bricks sequentially and capture image.

export type RenderRequest = {
    partName: string;
    color: string;
    resolve: (url: string) => void;
};

// Global Render Queue
export const renderQueue: RenderRequest[] = [];
export let isRendering = false;
export let processQueueInternal: (() => void) | null = null;

export function processQueue() {
    if (isRendering || renderQueue.length === 0 || !processQueueInternal) return;
    isRendering = true;
    processQueueInternal();
}

export function requestBrickImage(partName: string, color: string): Promise<string> {
    return new Promise((resolve) => {
        // Check cache (SessionStorage or Memory)
        const cacheKey = `brick_thumb_${partName}_${color}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            resolve(cached);
            return;
        }

        renderQueue.push({ partName, color, resolve });
        processQueue();
    });
}

function OffscreenBrickRenderer() {
    const [currentReq, setCurrentReq] = useState<RenderRequest | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const { gl, scene, camera } = useThree();
    const frameCountRef = useRef(0);
    const initialDelayRef = useRef(true);
    const idleHandleRef = useRef<number | null>(null);

    useEffect(() => {
        // Delay thumbnail generation adaptively, then start in idle time
        const profile = usePerformanceStore.getState().profile;
        const delayMs = profile?.thumbnailDelayMs ?? 2000;
        const timer = setTimeout(() => {
            const idleId = scheduleIdleWork(() => {
                initialDelayRef.current = false;
                processQueueInternal = () => {
                    const req = renderQueue.shift();
                    if (req) {
                        const ldr = `1 ${req.color} 0 0 0 1 0 0 0 1 0 0 0 1 ${req.partName}.dat`;
                        const blob = new Blob([ldr], { type: 'text/plain' });
                        const objUrl = URL.createObjectURL(blob);
                        setCurrentReq(req);
                        setUrl(objUrl);
                    } else {
                        isRendering = false;
                    }
                };
                processQueue();
            }, { timeout: 3000 });
            idleHandleRef.current = idleId;
        }, delayMs);
        return () => {
            clearTimeout(timer);
            if (idleHandleRef.current !== null) cancelIdleWork(idleHandleRef.current);
            processQueueInternal = null;
        };
    }, []);

    // When model loaded & rendered -> Capture
    const onLoaded = () => {
        // Wait a small tick for render
        setTimeout(async () => {
            if (!currentReq) return;

            // Yield to main thread every 3 renders to keep UI responsive
            frameCountRef.current++;
            if (frameCountRef.current % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Fit camera to brick bounding box for consistent sizing
            const box = new THREE.Box3().setFromObject(scene);
            if (!box.isEmpty()) {
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                box.getCenter(center);
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                const dist = (maxDim / (2 * Math.tan(fov / 2))) * 1.9; // Balanced: between 1.7 (too big) and 2.1 (too small)
                const k = 0.577; // 1/sqrt(3)
                camera.position.set(center.x + dist * k, center.y + dist * k, center.z + dist * k);
                camera.lookAt(center);
                camera.updateProjectionMatrix();
            }

            gl.render(scene, camera);
            const dataUrl = gl.domElement.toDataURL("image/png");

            // Cache & Resolve
            const cacheKey = `brick_thumb_${currentReq.partName}_${currentReq.color}`;
            try { sessionStorage.setItem(cacheKey, dataUrl); } catch { }
            currentReq.resolve(dataUrl);

            // Cleanup
            if (url) URL.revokeObjectURL(url);
            setUrl(null);
            setCurrentReq(null);

            // Next
            isRendering = false;
            processQueue();
        }, 50);
    };

    if (!url) return null;

    return (
        <Center>
            <LdrModel
                url={url}
                fitTrigger={url}
                fitMargin={1.6}
                onLoaded={onLoaded}
                onError={() => {
                    // Skip error
                    if (currentReq) currentReq.resolve(""); // Empty on error
                    isRendering = false;
                    processQueue();
                }}
            />
        </Center>
    );
}

// Global Renderer Component (Mounted once in page)
function OffscreenRenderer() {
    return (
        <div style={{ position: "absolute", top: -9999, left: -9999, width: 64, height: 64, visibility: "visible" }}>
            <Canvas
                gl={{ preserveDrawingBuffer: true, alpha: true }}
                camera={{ position: [100, 100, 100], fov: 35 }}
                dpr={1}
                frameloop="demand"
            >
                <ambientLight intensity={1.5} />
                <directionalLight position={[5, 10, 5]} intensity={2} />
                <OffscreenBrickRenderer />
            </Canvas>
        </div>
    );
}

export function BrickThumbnail({ partName, color }: { partName: string, color: string }) {
    const [imgUrl, setImgUrl] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        requestBrickImage(partName, color).then(url => {
            if (alive) setImgUrl(url);
        });
        return () => { alive = false; };
    }, [partName, color]);

    if (!imgUrl) {
        // Loading state
        return (
            <div className="kidsStep__brickColorBlock" style={{ background: "#eee", width: 60, height: 60, borderRadius: 6 }} />
        );
    }

    return (
        <div className="kidsStep__brickColorBlock" style={{
            width: 60, height: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fff", borderRadius: 6, border: "1px solid #eee"
        }}>
            <img src={imgUrl} alt={partName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    );
}

export type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
export const VIEW_ORDER: ViewName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export function FpsMonitor() {
    const reportFps = usePerformanceStore((s) => s.reportFps);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());

    useFrame(() => {
        frameCount.current++;
        const now = performance.now();
        if (now - lastTime.current >= 1000) {
            reportFps(frameCount.current);
            frameCount.current = 0;
            lastTime.current = now;
        }
    });

    return null;
}

export default OffscreenRenderer;
