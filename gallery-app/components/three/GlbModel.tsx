'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

interface GlbModelProps {
    url: string;
    cameraDistance?: number;
}

export default function GlbModel({ url, cameraDistance = 2.5 }: GlbModelProps) {
    const { scene } = useGLTF(url);
    const { invalidate, camera, controls } = useThree();
    const centered = useRef(false);

    useEffect(() => {
        if (!scene || centered.current) return;

        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        scene.position.set(-center.x, -center.y, -center.z);

        if (controls && (controls as any).target) {
            (controls as any).target.set(0, 0, 0);
            (controls as any).update();
        }
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(0, maxDim * 0.3, maxDim * cameraDistance);
        camera.lookAt(0, 0, 0);

        centered.current = true;
        invalidate();
    }, [scene, camera, controls, invalidate, cameraDistance]);

    return <primitive object={scene} />;
}
