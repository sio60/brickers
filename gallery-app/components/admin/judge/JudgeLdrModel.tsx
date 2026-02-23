"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import { patchThreeNullChildren, removeNullChildren, disposeObject3D } from "@/lib/three/threeUtils";
import { NORMAL_COLOR } from "./constants";

patchThreeNullChildren();

interface JudgeLdrModelProps {
    ldrContent: string;
    brickColors: Record<number, string>;
    focusBrickId: number | null;
    onLoaded?: () => void;
    onError?: (err: any) => void;
}

export const JudgeLdrModel = ({
    ldrContent,
    brickColors,
    focusBrickId,
    onLoaded,
    onError,
}: JudgeLdrModelProps) => {
    const { invalidate, camera, controls } = useThree();
    const [model, setModel] = useState<THREE.Group | null>(null);
    const meshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map());

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier());
        manager.onError = (path) => console.warn("[LDraw] failed to load:", path);

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(CDN_BASE);
        l.smoothNormals = false;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }

        return l;
    }, []);

    useEffect(() => {
        if (!ldrContent) return;
        let cancelled = false;
        let prev: THREE.Group | null = null;

        (async () => {
            try {
                setModel(null);

                await loader.preloadMaterials(CDN_BASE + "LDConfig.ldr");

                const blob = new Blob([ldrContent], { type: "text/plain" });
                const blobUrl = URL.createObjectURL(blob);

                const parsed = await loader.loadAsync(blobUrl);
                URL.revokeObjectURL(blobUrl);

                if (cancelled) { disposeObject3D(parsed); return; }
                if (!parsed) return;

                removeNullChildren(parsed);

                const meshMap = new Map<number, THREE.Mesh[]>();
                let brickId = 0;
                (parsed.children ?? []).forEach((child) => {
                    if (!child) return;
                    const meshes: THREE.Mesh[] = [];
                    child.traverse((obj: any) => {
                        if (obj?.isMesh) {
                            obj.userData.brickId = brickId;
                            meshes.push(obj);
                        }
                    });
                    if (meshes.length > 0) {
                        meshMap.set(brickId, meshes);
                        brickId++;
                    }
                });
                meshMapRef.current = meshMap;

                parsed.rotation.x = Math.PI;

                // 바닥 중심 정렬: bounding box 계산 후 모델 이동
                const box = new THREE.Box3().setFromObject(parsed);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                // X/Z 중심, Y는 바닥(min)을 0으로
                parsed.position.set(-center.x, -box.min.y, -center.z);

                // OrbitControls target을 모델 중심 높이로 설정
                const targetY = size.y / 2;
                if (controls && (controls as any).target) {
                    (controls as any).target.set(0, targetY, 0);
                    (controls as any).update();
                }
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(0, targetY + size.y * 0.3, maxDim * 2.5);
                camera.lookAt(0, targetY, 0);

                prev = parsed;
                setModel(parsed);
                invalidate();
                onLoaded?.();
            } catch (e) {
                console.error("[BrickJudge] load error:", e);
                onError?.(e);
            }
        })();

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [ldrContent, loader, onLoaded, onError, camera, controls, invalidate]);

    // 히트맵 적용
    useEffect(() => {
        if (!model) return;
        const meshMap = meshMapRef.current;

        meshMap.forEach((meshes, id) => {
            const issueColor = brickColors[id];
            meshes.forEach((mesh) => {
                if (!mesh.material) return;
                const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
                if (issueColor) {
                    mat.color = new THREE.Color(issueColor);
                    mat.emissive = new THREE.Color(issueColor);
                    mat.emissiveIntensity = 0.4;
                } else {
                    mat.color = new THREE.Color(NORMAL_COLOR);
                    mat.emissive = new THREE.Color(NORMAL_COLOR);
                    mat.emissiveIntensity = 0.15;
                }

                if (focusBrickId !== null && focusBrickId !== id) {
                    mat.transparent = true;
                    mat.opacity = 0.12;
                } else {
                    mat.transparent = false;
                    mat.opacity = 1;
                }

                mesh.material = mat;
            });
        });
        invalidate();
    }, [model, brickColors, focusBrickId, invalidate]);

    if (!model) return null;

    return <primitive object={model} />;
};
