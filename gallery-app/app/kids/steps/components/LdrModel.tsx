'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import { Bounds, Center, useBounds } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { removeNullChildren, disposeObject3D } from "@/lib/three/threeUtils";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import { preloadPartsBundle } from "@/lib/ldrawBundleLoader";

function LdrModel({
    url,
    overrideMainLdrUrl,
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
    onProgress,
    customBounds,
    fitTrigger,
    noFit,
    currentStep,
    stepMode = false,
    fitMargin = 1.5,
    smoothNormals = false,
}: {
    url: string;
    overrideMainLdrUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    onProgress?: (loaded: number, total: number) => void;
    customBounds?: THREE.Box3 | null;
    fitTrigger?: string;
    noFit?: boolean;
    currentStep?: number;
    stepMode?: boolean;
    fitMargin?: number;
    smoothNormals?: boolean;
}) {
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier({
            mainModelUrl: url,
            overrideMainLdrUrl,
            useProxy: false,
        }));
        manager.onProgress = (_url, loaded, total) => {
            onProgressRef.current?.(loaded, total);
        };

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = smoothNormals;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }
        return l;
    }, [partsLibraryPath, url, overrideMainLdrUrl, smoothNormals]);

    const [group, setGroup] = useState<THREE.Group | null>(null);
    const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());

    useEffect(() => {
        let cancelled = false;
        let prev: THREE.Group | null = null;
        (async () => {
            setGroup(null);
            await preloadPartsBundle(url);
            await loader.preloadMaterials(ldconfigUrl);
            const g = await loader.loadAsync(url);
            if (cancelled) { disposeObject3D(g); return; }
            if (g) {
                removeNullChildren(g);
                g.rotation.x = Math.PI;

                // Hide lines (white borders)
                g.traverse((child: any) => {
                    if (child.isLineSegments) {
                        child.visible = false;
                    }
                });

                // Clone materials for restoration
                g.traverse((child: any) => {
                    if (child.isMesh) {
                        originalMaterialsRef.current.set(child.uuid, Array.isArray(child.material) ? child.material.slice() : child.material);
                    }
                });
            }
            prev = g;
            setGroup(g);
            if (g) onLoaded?.(g);
        })().catch((e) => {
            console.error("[LDraw] load failed:", e);
            onError?.(e);
        });
        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
            originalMaterialsRef.current.clear();
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError]);

    // Step Mode Logic: Group by startingBuildingStep & apply transparency
    useLayoutEffect(() => {
        if (!group) return;

        // If not in stepMode, ensure full visibility
        if (!stepMode || currentStep === undefined) {
            group.traverse((child: any) => {
                if (child.isMesh) {
                    child.visible = true;
                    if (originalMaterialsRef.current.has(child.uuid)) {
                        (child as any).material = originalMaterialsRef.current.get(child.uuid);
                    }
                }
            });
            // Also ensure group children are visible
            group.children.forEach(child => { child.visible = true; });
            return;
        }

        // Group children by startingBuildingStep
        const stepGroups: THREE.Object3D[][] = [[]];
        group.children.forEach((child) => {
            if ((child as any).userData?.startingBuildingStep && stepGroups[stepGroups.length - 1].length > 0) {
                stepGroups.push([]);
            }
            stepGroups[stepGroups.length - 1].push(child);
        });

        const currentStepIndex = currentStep - 1; // 1-based to 0-based
        const activeStepsCount = stepGroups.length;

        // Identify children in current step vs previous steps
        const currentStepChildren = new Set<THREE.Object3D>(stepGroups[currentStepIndex] || []);
        const previousStepChildren = new Set<THREE.Object3D>();
        for (let i = 0; i < currentStepIndex; i++) {
            (stepGroups[i] || []).forEach(c => previousStepChildren.add(c));
        }

        group.traverse((child) => {
            // Find root child (direct descendant of group)
            let rootChild = child;
            while (rootChild.parent && rootChild.parent !== group) {
                rootChild = rootChild.parent;
            }

            if (rootChild.parent !== group) return; // Should not happen

            // Determine visibility
            const isCurrent = currentStepChildren.has(rootChild);
            const isPrevious = previousStepChildren.has(rootChild);

            if (isCurrent) {
                child.visible = true;
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                child.visible = true;
                // Make transparent
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const mat = Array.isArray(originalMat) ? originalMat[0].clone() : (originalMat as THREE.Material).clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            } else {
                // Future step
                // Hide purely
                child.visible = false;
                // If deep child, we might need to recursively hide, but traversing handles it if we hide rootChild?
                // The loop iterates ALL descendants.
                // If rootChild is hidden, descendants are hidden.
                // But we are setting .visible on descendants?
                // Wait, traverse hits everything.
                // If I set rootChild.visible = false, do I need to set children?
                // Three.js respects hierarchy.
            }
        });

        // Optimization: just set visibility on group.children (top level)
        group.children.forEach(child => {
            const isCurrent = currentStepChildren.has(child);
            const isPrevious = previousStepChildren.has(child);
            child.visible = isCurrent || isPrevious;
        });

        // Apply materials only to visible meshes
        group.traverse((child) => {
            if (!child.visible) return;
            // Check if it belongs to current or previous
            let root = child;
            while (root.parent && root.parent !== group) root = root.parent;

            const isCurrent = currentStepChildren.has(root);
            const isPrevious = previousStepChildren.has(root);

            if (isCurrent) {
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const baseMat = Array.isArray(originalMat) ? originalMat[0] : originalMat;
                        const mat = baseMat.clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            }
        });

    }, [group, currentStep, stepMode]);

    if (!group) return null;

    let boundMesh = null;
    if (customBounds) {
        const size = new THREE.Vector3();
        customBounds.getSize(size);
        const center = new THREE.Vector3();
        customBounds.getCenter(center);
        boundMesh = (
            <mesh position={[center.x, -center.y, center.z]}>
                <boxGeometry args={[size.x, size.y, size.z]} />
                <meshBasicMaterial transparent opacity={0} wireframe />
            </mesh>
        );
    }

    return (
        <Bounds fit={!noFit} clip margin={fitMargin}>
            <Center>
                <primitive object={group} />
                {boundMesh}
            </Center>
            {!noFit && <FitOnceOnLoad trigger={fitTrigger ?? ""} />}
        </Bounds>
    );
}

export function FitOnceOnLoad({ trigger }: { trigger: string }) {
    const bounds = useBounds();
    useEffect(() => {
        bounds?.refresh().fit();
    }, [bounds, trigger]);
    return null;
}

export default LdrModel;
