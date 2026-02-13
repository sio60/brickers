'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * Drives a frameloop="demand" Canvas at a fixed FPS.
 * Place inside <Canvas frameloop="demand"> to cap rendering.
 * Uses setInterval to continuously call invalidate(), since useFrame
 * only runs during frame renders and cannot self-sustain the loop.
 * Default: 24 fps (sufficient for 3D model viewing / background animation).
 */
export default function ThrottledDriver({ fps = 24 }: { fps?: number }) {
    const { invalidate } = useThree();

    useEffect(() => {
        const ms = 1000 / fps;
        const id = setInterval(() => invalidate(), ms);
        return () => clearInterval(id);
    }, [fps, invalidate]);

    return null;
}
