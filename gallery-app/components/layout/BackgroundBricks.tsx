'use client';

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";
import dynamic from 'next/dynamic';
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { usePerformanceStore } from "@/stores/performanceStore";

// Random utility functions
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const randomColor = () => {
    const colors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7", "#ec4899", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Physics constants (calibrated for 60fps baseline)
const FRICTION = 0.98;
const IMPULSE_STRENGTH = 0.15;
const GRAVITY = 0.015;
const FLOOR_Y = -8;
const BOUNCE_DAMPING = 0.6;
const TARGET_DT = 1 / 60; // 60fps baseline for delta normalization

type ShapeType = "standard" | "long" | "cylinder" | "circle";

type BrickProps = {
    position: [number, number, number];
    color: string;
    rotation: [number, number, number];
    scale: number;
    shape: ShapeType;
    entryDirection?: "top" | "sides" | "float";
};

type BrickSeed = Omit<BrickProps, "entryDirection"> & { id: number };

// Stud geometry helpers
const Stud = ({ position, color }: { position: [number, number, number]; color: string }) => (
    <mesh position={position}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
);

function Brick({
    position: initialPos,
    color,
    rotation: initialRot,
    scale,
    shape,
    entryDirection = "float",
}: BrickProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const isSides = entryDirection === "sides";
    const isFloat = entryDirection === "float";

    const position = useRef(
        useMemo(() => {
            if (isSides) {
                const side = Math.random() > 0.5 ? 1 : -1;
                return new THREE.Vector3(side * 35, randomRange(-5, 15), initialPos[2]);
            }
            if (isFloat) {
                return new THREE.Vector3(initialPos[0], initialPos[1], initialPos[2]);
            }
            return new THREE.Vector3(initialPos[0], initialPos[1] + 25, initialPos[2]);
        }, [initialPos, isSides, isFloat])
    );

    const velocity = useRef(
        useMemo(() => {
            if (isSides) {
                const xDir = position.current.x > 0 ? -1 : 1;
                return new THREE.Vector3(xDir * randomRange(0.2, 0.5), randomRange(0.2, 0.5), 0);
            }
            if (isFloat) {
                return new THREE.Vector3(
                    randomRange(-0.02, 0.02),
                    randomRange(0.01, 0.05),
                    randomRange(-0.02, 0.02)
                );
            }
            return new THREE.Vector3(0, -randomRange(0.1, 0.3), 0);
        }, [isSides, isFloat])
    );

    const angularVelocity = useRef(
        new THREE.Vector3(randomRange(-0.1, 0.1), randomRange(-0.1, 0.1), randomRange(-0.1, 0.1))
    );

    const isFalling = useRef(!isFloat);

    // Delta-time based physics: FPS-independent movement
    useFrame((_, delta) => {
        if (!meshRef.current) return;

        const pos = position.current;
        const vel = velocity.current;
        const rot = meshRef.current.rotation;
        const angVel = angularVelocity.current;

        // Normalize delta to 60fps baseline (60fps→1.0, 30fps→2.0, 15fps→4.0)
        const dt = Math.min(delta / TARGET_DT, 4); // Clamp to prevent physics explosion

        if (isFalling.current) {
            vel.y -= GRAVITY * dt;
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
            pos.z += vel.z * dt;

            rot.x += angVel.x * dt;
            rot.y += angVel.y * dt;
            rot.z += angVel.z * dt;

            if (pos.y < FLOOR_Y) {
                pos.y = FLOOR_Y;
                vel.y = -vel.y * BOUNCE_DAMPING;

                vel.x += randomRange(-0.05, 0.05);
                vel.z += randomRange(-0.05, 0.05);

                angVel.x = randomRange(-0.2, 0.2);
                angVel.z = randomRange(-0.2, 0.2);

                if (Math.abs(vel.y) < 0.1 && Math.abs(vel.x) < 0.1) {
                    isFalling.current = false;
                    vel.set(randomRange(-0.02, 0.02), randomRange(0.01, 0.05), randomRange(-0.02, 0.02));
                }
            }
        } else {
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
            pos.z += vel.z * dt;

            rot.x += angVel.x * dt;
            rot.y += angVel.y * dt;
            rot.z += angVel.z * dt;

            vel.multiplyScalar(Math.pow(FRICTION, dt));
            angVel.multiplyScalar(Math.pow(FRICTION, dt));

            if (pos.y > 15 || pos.y < -15) vel.y *= -1;
            if (pos.x > 25 || pos.x < -25) vel.x *= -1;
            if (pos.z > 5 || pos.z < -30) vel.z *= -1;
        }

        meshRef.current.position.copy(pos);
    });

    const onHover = () => {
        velocity.current.set(
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH),
            randomRange(IMPULSE_STRENGTH * 0.5, IMPULSE_STRENGTH),
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH)
        );
        angularVelocity.current.set(
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1)
        );
        isFalling.current = false;
    };

    const renderGeometry = () => {
        switch (shape) {
            case "long":
                return (
                    <>
                        <boxGeometry args={[2, 1, 1]} />
                        <Stud position={[0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[0.5, 0.6, -0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, -0.25]} color={color} />
                    </>
                );

            case "cylinder":
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                        <Stud position={[0, 0.6, 0]} color={color} />
                    </>
                );

            case "circle":
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 0.4, 32]} />
                        <Stud position={[0, 0.3, 0]} color={color} />
                    </>
                );

            case "standard":
            default:
                return (
                    <>
                        <boxGeometry args={[1, 1, 1]} />
                        <Stud position={[0.25, 0.6, 0.25]} color={color} />
                        <Stud position={[-0.25, 0.6, 0.25]} color={color} />
                        <Stud position={[0.25, 0.6, -0.25]} color={color} />
                        <Stud position={[-0.25, 0.6, -0.25]} color={color} />
                    </>
                );
        }
    };

    return (
        <mesh ref={meshRef} rotation={initialRot} scale={scale} onPointerOver={onHover}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            {renderGeometry()}
        </mesh>
    );
}

function Background3DContent({
    entryDirection = "float",
    brickCount = 40,
    fps = 24,
}: {
    entryDirection?: "top" | "sides" | "float";
    brickCount?: number;
    fps?: number;
}) {
    const shapes: ShapeType[] = ["standard", "long", "cylinder", "circle"];
    const randomShape = () => shapes[Math.floor(Math.random() * shapes.length)];

    const bricks = useMemo<BrickSeed[]>(() => {
        return Array.from({ length: brickCount }).map((_, i) => ({
            id: i,
            position: [randomRange(-15, 15), randomRange(-10, 10), randomRange(-5, -20)],
            rotation: [randomRange(0, Math.PI), randomRange(0, Math.PI), 0],
            color: randomColor(),
            scale: randomRange(0.8, 1.5),
            shape: randomShape(),
        }));
    }, [brickCount]);

    return (
        <Canvas
            camera={{ position: [0, 0, 10], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
            frameloop="demand"
        >
            <ThrottledDriver fps={fps} />
            <ambientLight intensity={0.8} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <directionalLight position={[-5, 5, 5]} intensity={1} />

            {bricks.map(({ id, ...props }) => (
                <Brick key={id} {...props} entryDirection={entryDirection} />
            ))}

            <Environment preset="city" />
        </Canvas>
    );
}

// Ensure it's client-side only and no SSR
const Background3DDynamic = dynamic(() => Promise.resolve(Background3DContent), {
    ssr: false,
    loading: () => null
});

export default function BackgroundBricks() {
    const isBackgroundPaused = usePerformanceStore((s) => s.isBackgroundPaused);
    const profile = usePerformanceStore((s) => s.profile);

    const brickCount = profile?.backgroundBrickCount ?? 40;
    const fps = profile?.backgroundFps ?? 24;

    // Paused or zero bricks → static white div only (no Canvas, no GPU usage)
    if (isBackgroundPaused || brickCount === 0) {
        return (
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 0,
                    background: "#fff",
                }}
            />
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                background: "#fff",
                overflow: "hidden",
                pointerEvents: "auto",
            }}
        >
            <Background3DDynamic entryDirection="top" brickCount={brickCount} fps={fps} />
        </div>
    );
}
