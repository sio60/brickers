'use client';

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, a, config } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import { GalleryItem } from '../types/gallery';

interface Carousel3DProps {
    items: GalleryItem[];
    onPreview?: (url: string) => void;
}

function Card({
    item,
    index,
    activeIndex,
    offset,
    onClick
}: {
    item: GalleryItem;
    index: number;
    activeIndex: number;
    offset: number;
    onClick: () => void;
}) {
    const mesh = useRef<THREE.Mesh>(null!);

    // Use proxy for S3 images to avoid CORS issues in WebGL
    const rawUrl = item.thumbnailUrl || '/api/placeholder/400/320';
    const textureUrl = rawUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

    const texture = useTexture(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const isActive = index === activeIndex;
    const absOffset = Math.abs(offset);

    // Coverflow Layout Calculation
    const x = offset * 1.1;
    const z = -absOffset * 1.2;
    const rotY = offset * -0.6; // ~34.4 degrees in radians

    // Animation Spring
    const { position, rotation, scale, materialColor } = useSpring({
        position: [x, 0, z],
        rotation: [0, rotY, 0],
        scale: isActive ? 1.1 : 1,
        materialColor: isActive ? '#ffffff' : '#dddddd',
        config: config.gentle
    });

    // Bypass TypeScript error for animated material
    const AnimatedMaterial = a.meshPhysicalMaterial as any;

    return (
        <a.mesh
            ref={mesh}
            position={position as any}
            rotation={rotation as any}
            scale={scale}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <boxGeometry args={[2.0, 2.8, 0.05]} /> {/* Card Aspect Ratio */}
            <AnimatedMaterial
                map={texture}
                color={materialColor}
                metalness={0.1}
                roughness={0.4}
                clearcoat={0.5}
                clearcoatRoughness={0.1}
            />

            {/* Edge highlight/border mesh could be added here for detail */}
        </a.mesh>
    );
}

function Rig({ children, activeIndex, setActiveIndex, itemCount }: {
    children: React.ReactNode;
    activeIndex: number;
    setActiveIndex: (i: number) => void;
    itemCount: number;
}) {
    const group = useRef<THREE.Group>(null!);
    const { width } = useThree((state) => state.viewport);

    // Drag Logic
    const bind = useDrag(({ offset: [x], direction: [dx], velocity: [vx], down, movement: [mx] }) => {
        // Simple drag to rotate logic or change index
        // This is complex to map 1:1 with spring index, simplified version:
        if (!down && Math.abs(mx) > 30) {
            const dir = mx > 0 ? -1 : 1;
            const nextIndex = THREE.MathUtils.clamp(activeIndex + dir, 0, itemCount - 1);
            if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
        }
    });

    return (
        <group ref={group} {...bind()} position={[0, -0.2, 0]}>
            {children}
        </group>
    );
}

function Scene({ items, onPreview }: Carousel3DProps) {
    const [activeIndex, setActiveIndex] = useState(Math.floor(items.length / 2));

    return (
        <>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <Environment preset="city" />

            <group position={[0, -0.2, 0]}>
                {items.map((item, i) => (
                    <Card
                        key={item.id}
                        item={item}
                        index={i}
                        activeIndex={activeIndex}
                        offset={i - activeIndex}
                        onClick={() => {
                            if (i === activeIndex) onPreview?.(item.ldrUrl || '');
                            else setActiveIndex(i);
                        }}
                    />
                ))}
            </group>

            {/* Global event handler wrapper could go here if needed for swipe */}
        </>
    );
}


export default function Carousel3D({ items = [], onPreview }: Carousel3DProps) {
    if (items.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '500px', position: 'relative' }}>
            <Canvas shadows camera={{ position: [0, 0, 6], fov: 45 }}>
                <Suspense fallback={null}>
                    <Scene items={items} onPreview={onPreview} />
                </Suspense>
            </Canvas>
        </div>
    );
}
