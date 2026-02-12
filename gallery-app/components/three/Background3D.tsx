'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";

function ThrottledDriver({ fps = 24 }: { fps?: number }) {
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

// Random utility functions
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const randomColor = () => {
    const colors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7", "#ec4899", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Physics constants
const FRICTION = 0.98;
const IMPULSE_STRENGTH = 0.15;
const GRAVITY = 0.015;
const FLOOR_Y = -8;
const BOUNCE_DAMPING = 0.6;
const FLOAT_FORCE = 0.002;

type ShapeType = "standard" | "long" | "cylinder" | "circle";

type BrickProps = {
    position: [number, number, number];
    color: string;
    rotation: [number, number, number];
    scale: number;
    shape: ShapeType;
    entryDirection?: "top" | "sides" | "float";
    id?: number;
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
    entryDirection = "top",
    id,
}: BrickProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const isSides = entryDirection === "sides";
    const isFloat = entryDirection === "float";

    // Initialize position based on entry direction
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

    // Physics State
    const isSettled = useRef(isFloat);
    const floatOffset = useRef(randomRange(0, Math.PI * 2)); // Random phase for sine wave

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const pos = position.current;
        const vel = velocity.current;
        const rot = meshRef.current.rotation;
        const angVel = angularVelocity.current;

        if (!isSettled.current) {
            // FALLING STATE
            vel.y -= GRAVITY; // gravity
            pos.add(vel); // move

            // floor collision
            if (pos.y < FLOOR_Y) {
                pos.y = FLOOR_Y;
                vel.y = -vel.y * BOUNCE_DAMPING;
                vel.x += randomRange(-0.05, 0.05);
                vel.z += randomRange(-0.05, 0.05);

                angVel.x = randomRange(-0.2, 0.2);
                angVel.z = randomRange(-0.2, 0.2);

                // If bounce is small enough, switch to Settled/Floating state
                if (Math.abs(vel.y) < 0.1 && Math.abs(vel.x) < 0.1) {
                    isSettled.current = true;
                    // Reset heavy downward velocity, keep some random drift for float start
                    vel.set(randomRange(-0.02, 0.02), randomRange(0.01, 0.03), randomRange(-0.02, 0.02));
                    angVel.set(randomRange(-0.01, 0.01), randomRange(-0.01, 0.01), randomRange(-0.01, 0.01));
                }
            }
        } else {
            // FLOATING / ZERO-GRAVITY STATE

            // 1. Move by velocity (drifting)
            pos.add(vel);

            // 2. Apply Drag (Friction) to slow down impulses
            vel.multiplyScalar(FRICTION);

            // 3. Add Sine Wave Idle Motion (Ups and Downs)
            // We add this directly to velocity or position. 
            // Adding small force to velocity creates smoother drift.
            const time = state.clock.elapsedTime;
            vel.y += Math.sin(time + floatOffset.current) * 0.0005;
            vel.x += Math.cos(time * 0.5 + floatOffset.current) * 0.0002;

            // 4. Rotate slowly
            rot.x += angVel.x;
            rot.y += angVel.y;
            rot.z += angVel.z;
            angVel.multiplyScalar(0.99); // Slow down rotation over time

            // 5. Keep inside Bounds (Bounce off invisible walls)
            // X bounds
            if (pos.x > 25 || pos.x < -25) {
                vel.x = -vel.x * 0.8;
                pos.x = Math.max(-25, Math.min(25, pos.x));
            }
            // Y bounds (Ceiling and Floor for zero-g)
            if (pos.y > 15 || pos.y < FLOOR_Y) {
                vel.y = -vel.y * 0.8;
                pos.y = Math.max(FLOOR_Y, Math.min(15, pos.y));
            }
            // Z bounds
            if (pos.z > 0 || pos.z < -20) {
                vel.z = -vel.z * 0.8;
                pos.z = Math.max(-20, Math.min(0, pos.z));
            }
        }

        // Apply visual rotation from physics + falling
        if (!isSettled.current) {
            rot.x += angVel.x;
            rot.y += angVel.y;
            rot.z += angVel.z;
        }

        meshRef.current.position.copy(pos);
    });

    const onHover = () => {
        // Apply impulse
        velocity.current.add(new THREE.Vector3(
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH),
            randomRange(IMPULSE_STRENGTH * 0.5, IMPULSE_STRENGTH), // Slight upward bias
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH)
        ));

        // Add rotation impulse
        angularVelocity.current.add(new THREE.Vector3(
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1)
        ));

        // If it was still falling, force settle to start floating? 
        // Or let it keep falling? Let's just let physics handle it. 
        // If falling, the heavy gravity will overcome this impulse mostly.
        // If floating, this will cause it to fly around.
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

export default function Background3D({
    entryDirection = "top",
}: {
    entryDirection?: "top" | "sides" | "float";
}) {
    const brickCount = 40;
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
    }, []);

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
            <Canvas frameloop="demand" camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
                <ThrottledDriver fps={24} />
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <directionalLight position={[-5, 5, 5]} intensity={1} />

                {bricks.map(({ id, ...props }) => (
                    <Brick key={id} id={id} {...props} entryDirection={entryDirection} />
                ))}

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
