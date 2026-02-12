'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

/**
 * Drives a frameloop="demand" Canvas at a fixed FPS.
 * Place inside <Canvas frameloop="demand"> to cap rendering.
 * Default: 24 fps (sufficient for 3D model viewing / background animation).
 */
export default function ThrottledDriver({ fps = 24 }: { fps?: number }) {
    const { invalidate } = useThree();
    const last = useRef(0);
    const interval = 1000 / fps;

    useFrame(({ clock }) => {
        const now = clock.getElapsedTime() * 1000;
        if (now - last.current >= interval) {
            last.current = now;
            invalidate();
        }
    });
    return null;
}
