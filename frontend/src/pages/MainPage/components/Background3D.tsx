import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";

// Random utility functions
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomColor = () => {
    const colors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7", "#ec4899", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Physics constants
const FRICTION = 0.98; // Less friction for floating
const IMPULSE_STRENGTH = 0.15;
const GRAVITY = 0.015;
const FLOOR_Y = -8;
const BOUNCE_DAMPING = 0.6;

type ShapeType = "standard" | "long" | "cylinder" | "circle";

type BrickProps = {
    position: [number, number, number];
    color: string;
    rotation: [number, number, number];
    scale: number;
    shape: ShapeType;
};

// Stud geometry helpers
const Stud = ({ position, color }: { position: [number, number, number]; color: string }) => (
    <mesh position={position}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
);

function Brick({ position: initialPos, color, rotation: initialRot, scale, shape }: BrickProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Physics state
    // Start high up for the drop effect
    const position = useRef(new THREE.Vector3(initialPos[0], initialPos[1] + 25, initialPos[2]));
    const velocity = useRef(new THREE.Vector3(0, -randomRange(0.1, 0.3), 0)); // Initial drop speed
    const angularVelocity = useRef(new THREE.Vector3(randomRange(-0.1, 0.1), randomRange(-0.1, 0.1), randomRange(-0.1, 0.1)));

    // We need to track rotation state somewhere to apply physics
    // Current mesh rotation is not enough if we want to separate "velocity" logic? 
    // Actually we can just read/write mesh rotation. But for consistency let's use a ref or just modify mesh directly.
    // The previous code used meshRef.current.rotation directly in useFrame, which is fine.
    // But we need to set initial rotation.

    // State machine: 'falling' | 'floating'
    const isFalling = useRef(true);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        const pos = position.current;
        const vel = velocity.current;
        const rot = meshRef.current.rotation;
        const angVel = angularVelocity.current;

        if (isFalling.current) {
            // GRAVITY
            vel.y -= GRAVITY;

            // Move
            pos.add(vel);

            // Rotate while falling
            rot.x += angVel.x;
            rot.y += angVel.y;
            rot.z += angVel.z;

            // Floor Collision
            if (pos.y < FLOOR_Y) {
                pos.y = FLOOR_Y;
                vel.y = -vel.y * BOUNCE_DAMPING;

                // Add some random horizontal scatter on bounce
                vel.x += randomRange(-0.05, 0.05);
                vel.z += randomRange(-0.05, 0.05);

                // Add spin on bounce
                angVel.x = randomRange(-0.2, 0.2);
                angVel.z = randomRange(-0.2, 0.2);

                // Check if stopped bouncing
                if (Math.abs(vel.y) < 0.1) {
                    isFalling.current = false;
                    // Give a gentle "float" velocity to start zero-g mode
                    vel.set(randomRange(-0.02, 0.02), randomRange(0.01, 0.05), randomRange(-0.02, 0.02));
                }
            }
        } else {
            // FLOATING (Zero Gravity)

            // Apply velocity (drift)
            pos.add(vel);

            // Rotate gently
            rot.x += angVel.x + delta * 0.2;
            rot.y += angVel.y + delta * 0.3;

            // Friction (very low in space)
            vel.multiplyScalar(FRICTION);
            angVel.multiplyScalar(FRICTION);

            // Bounds check for floating (don't drift too far away)
            if (pos.y > 15 || pos.y < -15) vel.y *= -1;
            if (pos.x > 25 || pos.x < -25) vel.x *= -1;
        }

        // Sync ref to mesh
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
            case "long": // 2x4 Brick style (approx 2x1 visual scale here)
                return (
                    <>
                        <boxGeometry args={[2, 1, 1]} />
                        <Stud position={[0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[0.5, 0.6, -0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, -0.25]} color={color} />
                        {/* Extra studs for 2x geometry if needed, let's keep it simple 2x2 arrangement spread out or 4x2 */}
                    </>
                );
            case "cylinder": // Tall Cylinder
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                        <Stud position={[0, 0.6, 0]} color={color} />
                    </>
                );
            case "circle": // Round 1x1 Plate-ish or Round Brick
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 0.4, 32]} />
                        <Stud position={[0, 0.3, 0]} color={color} />
                    </>
                );
            case "standard": // 2x2 Square
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
        <mesh
            ref={meshRef}
            // Initial rotation only
            rotation={initialRot}
            scale={scale}
            onPointerOver={onHover}
        >
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            {renderGeometry()}
        </mesh>
    );
}

export default function Background3D() {
    const brickCount = 40;
    const shapes: ShapeType[] = ["standard", "long", "cylinder", "circle"];
    const randomShape = () => shapes[Math.floor(Math.random() * shapes.length)];

    const bricks = useMemo(() => {
        return Array.from({ length: brickCount }).map((_, i) => ({
            key: i,
            position: [
                randomRange(-15, 15),
                randomRange(-10, 10),
                randomRange(-5, -20), // Background depth
            ] as [number, number, number],
            rotation: [
                randomRange(0, Math.PI),
                randomRange(0, Math.PI),
                0
            ] as [number, number, number],
            color: randomColor(),
            scale: randomRange(0.8, 1.5),
            shape: randomShape(),
        }));
    }, []);

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#fff" }}>
            <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <directionalLight position={[-5, 5, 5]} intensity={1} />

                {bricks.map((props) => (
                    <Brick {...props} />
                ))}

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
