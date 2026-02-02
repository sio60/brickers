'use client';

// ... imports
// import "./BrickStackMiniGame.css"; // Removed
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useLanguage } from "../../contexts/LanguageContext";

// --- Game Settings ---
const BOARD_WIDTH = 6;       // Board width in world units
const BRICK_HEIGHT = 0.4;    // Brick height
const INITIAL_BRICK_WIDTH = 2.5;  // Initial brick width
const MOVE_SPEED = 3.5;      // Movement speed
const FALL_SPEED = 12;       // Falling speed
const FLOOR_Y = -3;          // Floor Y position

type Brick = {
    id: string;
    x: number;
    y: number;
    width: number;
    color: string;
};

type FallingPiece = {
    id: string;
    x: number;
    y: number;
    width: number;
    velocityX: number;
    velocityY: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
};

type GameState = {
    x: number;
    y: number;
    width: number;
    dir: 1 | -1;
    phase: 'moving' | 'falling' | 'landed';
    targetY: number;
};

const COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// --- Falling Piece Component ---
function FallingPieceComponent({ piece }: { piece: FallingPiece }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const stateRef = useRef({ ...piece });

    useFrame((_, dt) => {
        const s = stateRef.current;
        s.velocityY -= 20 * dt;
        s.x += s.velocityX * dt;
        s.y += s.velocityY * dt;
        s.rotation += s.rotationSpeed * dt;

        if (meshRef.current) {
            meshRef.current.position.set(s.x, s.y, 0);
            meshRef.current.rotation.z = s.rotation;
        }
    });

    return (
        <RoundedBox
            ref={meshRef as any}
            args={[piece.width - 0.05, BRICK_HEIGHT - 0.05, 1]}
            radius={0.1}
            smoothness={4}
            position={[piece.x, piece.y, 0]}
        >
            <meshStandardMaterial color={piece.color} transparent opacity={0.8} />
        </RoundedBox>
    );
}

// --- Main Scene ---
function Scene({
    bricks,
    stateRef,
    onDrop,
    onLanded,
    currentColor,
}: {
    bricks: Brick[];
    stateRef: React.MutableRefObject<GameState>;
    onDrop: () => void;
    onLanded: () => void;
    currentColor: string;
}) {
    const activeMesh = useRef<THREE.Mesh>(null);

    useFrame((_, dt) => {
        const state = stateRef.current;

        if (state.phase === 'moving') {
            const maxX = (BOARD_WIDTH - state.width) / 2;
            state.x += state.dir * MOVE_SPEED * dt;

            if (state.x >= maxX) {
                state.x = maxX;
                state.dir = -1;
            } else if (state.x <= -maxX) {
                state.x = -maxX;
                state.dir = 1;
            }
        } else if (state.phase === 'falling') {
            state.y -= FALL_SPEED * dt;

            if (state.y <= state.targetY) {
                state.y = state.targetY;
                state.phase = 'landed';
                onLanded();
            }
        }

        if (activeMesh.current) {
            activeMesh.current.position.set(state.x, state.y, 0);
        }
    });

    const stackHeight = bricks.length * BRICK_HEIGHT;

    return (
        <>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight position={[-3, 5, -3]} intensity={0.3} />

            <mesh position={[0, FLOOR_Y - 0.2, 0]} receiveShadow>
                <boxGeometry args={[BOARD_WIDTH + 1, 0.4, 3]} />
                <meshStandardMaterial color="#e5e7eb" />
            </mesh>

            {bricks.map((b) => (
                <RoundedBox
                    key={b.id}
                    args={[b.width - 0.05, BRICK_HEIGHT - 0.05, 1]}
                    radius={0.1}
                    smoothness={4}
                    position={[b.x, b.y, 0]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial color={b.color} />
                </RoundedBox>
            ))}

            {stateRef.current.phase !== 'landed' && (
                <RoundedBox
                    ref={activeMesh as any}
                    args={[stateRef.current.width - 0.05, BRICK_HEIGHT - 0.05, 1]}
                    radius={0.1}
                    smoothness={4}
                    position={[stateRef.current.x, stateRef.current.y, 0]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial color={currentColor} />
                </RoundedBox>
            )}

            <mesh position={[0, stackHeight + FLOOR_Y + 3, 0]} onPointerDown={onDrop}>
                <boxGeometry args={[BOARD_WIDTH + 4, 15, 4]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

function CameraFollow({ stackHeight }: { stackHeight: number }) {
    useFrame((state) => {
        const targetY = Math.max(0, stackHeight + FLOOR_Y + 3.5);
        state.camera.position.y = THREE.MathUtils.lerp(
            state.camera.position.y,
            targetY,
            0.1
        );
        state.camera.lookAt(0, targetY - 1, 0);
    });
    return null;
}

interface BrickStackProps {
    percent?: number;
}

export default function BrickStackMiniGame({ percent }: BrickStackProps) {
    const { t } = useLanguage();
    const [bricks, setBricks] = useState<Brick[]>([]);
    const [fallingPieces, setFallingPieces] = useState<FallingPiece[]>([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [currentColor, setCurrentColor] = useState(getRandomColor());
    const [, forceUpdate] = useState(0);
    const triggerUpdate = useCallback(() => forceUpdate(n => n + 1), []);

    const getSpawnY = useCallback((count: number) => {
        return FLOOR_Y + BRICK_HEIGHT / 2 + count * BRICK_HEIGHT + 3;
    }, []);

    const stateRef = useRef<GameState>({
        x: 0,
        y: getSpawnY(0),
        width: INITIAL_BRICK_WIDTH,
        dir: 1,
        phase: 'moving',
        targetY: FLOOR_Y + BRICK_HEIGHT / 2,
    });

    const resetGame = useCallback(() => {
        setBricks([]);
        setFallingPieces([]);
        setScore(0);
        setGameOver(false);
        setCurrentColor(getRandomColor());
        stateRef.current = {
            x: 0,
            y: getSpawnY(0),
            width: INITIAL_BRICK_WIDTH,
            dir: 1,
            phase: 'moving',
            targetY: FLOOR_Y + BRICK_HEIGHT / 2,
        };
        triggerUpdate();
    }, [getSpawnY, triggerUpdate]);

    useEffect(() => {
        if (fallingPieces.length === 0) return;
        const timer = setTimeout(() => {
            setFallingPieces((prev) => prev.slice(5));
        }, 3000);
        return () => clearTimeout(timer);
    }, [fallingPieces]);

    const spawnNext = useCallback((width: number, count: number) => {
        setTimeout(() => {
            const nextColor = getRandomColor();
            setCurrentColor(nextColor);
            stateRef.current = {
                x: -BOARD_WIDTH / 2 + (Math.random() * 0.5),
                y: getSpawnY(count),
                width: width,
                dir: Math.random() > 0.5 ? 1 : -1,
                phase: 'moving',
                targetY: FLOOR_Y + BRICK_HEIGHT / 2 + count * BRICK_HEIGHT,
            };
            triggerUpdate();
        }, 100);
    }, [getSpawnY, triggerUpdate]);

    const onLanded = useCallback(() => {
        const state = stateRef.current;

        if (bricks.length === 0) {
            const newBrick: Brick = {
                id: `brick-${Date.now()}`,
                x: state.x,
                y: state.targetY,
                width: state.width,
                color: currentColor,
            };
            setBricks([newBrick]);
            setScore(1);
            spawnNext(state.width, 1);
            return;
        }

        const topBrick = bricks[bricks.length - 1];
        let finalX = state.x;
        if (Math.abs(state.x - topBrick.x) < 0.1) {
            finalX = topBrick.x;
        }

        const topLeft = topBrick.x - topBrick.width / 2;
        const topRight = topBrick.x + topBrick.width / 2;
        const dropLeft = finalX - state.width / 2;
        const dropRight = finalX + state.width / 2;

        const overlapLeft = Math.max(topLeft, dropLeft);
        const overlapRight = Math.min(topRight, dropRight);
        const overlapWidth = overlapRight - overlapLeft;

        if (overlapWidth <= 0) {
            setGameOver(true);
            setFallingPieces((prev) => [
                ...prev,
                {
                    id: `fall-${Date.now()}`,
                    x: state.x,
                    y: state.y,
                    width: state.width,
                    velocityX: state.dir * 2,
                    velocityY: 0,
                    rotation: 0,
                    rotationSpeed: state.dir * 3,
                    color: currentColor,
                },
            ]);
            return;
        }

        const newFalling: FallingPiece[] = [];
        if (dropLeft < overlapLeft) {
            const cutWidth = overlapLeft - dropLeft;
            newFalling.push({
                id: `cut-l-${Date.now()}`,
                x: dropLeft + cutWidth / 2,
                y: state.y,
                width: cutWidth,
                velocityX: -2,
                velocityY: 1,
                rotation: 0,
                rotationSpeed: -4,
                color: currentColor,
            });
        }
        if (dropRight > overlapRight) {
            const cutWidth = dropRight - overlapRight;
            newFalling.push({
                id: `cut-r-${Date.now()}`,
                x: overlapRight + cutWidth / 2,
                y: state.y,
                width: cutWidth,
                velocityX: 2,
                velocityY: 1,
                rotation: 0,
                rotationSpeed: 4,
                color: currentColor,
            });
        }

        if (newFalling.length > 0) {
            setFallingPieces((prev) => [...prev, ...newFalling]);
        }

        const newBrick: Brick = {
            id: `brick-${Date.now()}`,
            x: (overlapLeft + overlapRight) / 2,
            y: state.targetY,
            width: overlapWidth,
            color: currentColor,
        };

        setBricks((prev) => {
            const updated = [...prev, newBrick];
            spawnNext(overlapWidth, updated.length);
            return updated;
        });
        setScore((s) => s + 1);
    }, [bricks, currentColor, spawnNext]);

    const onDrop = useCallback(() => {
        if (gameOver) return;
        const state = stateRef.current;
        if (state.phase !== 'moving') return;

        state.phase = 'falling';
        triggerUpdate();
    }, [gameOver, triggerUpdate]);

    const stackHeight = bricks.length * BRICK_HEIGHT;

    return (
        <div className="w-full max-w-[500px] mx-auto bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] relative">
            {percent !== undefined && (
                <div className="absolute top-4 left-4 right-4 bg-white/80 backdrop-blur-[4px] p-3 rounded-xl z-20 flex flex-col gap-1.5 border border-black/5">
                    <div className="text-sm font-bold text-gray-600 flex justify-between">
                        <span>{t.kids.generate.loading}</span>
                        <span>{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-3 pt-4 px-4" style={{ marginTop: percent !== undefined ? 80 : 0 }}>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[36px] font-black text-[#1a1a1a] drop-shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">{score}</span>
                    <span className="text-[10px] font-extrabold text-[#999] tracking-[0.1em] mt-[-2px]">BRICKS</span>
                </div>
            </div>

            <div className="relative w-full h-[550px] sm:h-[480px] rounded-[20px] overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
                <Canvas shadows camera={{ position: [0, 1, 9], fov: 50 }}>
                    <CameraFollow stackHeight={stackHeight} />
                    <Scene
                        bricks={bricks}
                        stateRef={stateRef}
                        onDrop={onDrop}
                        onLanded={onLanded}
                        currentColor={currentColor}
                    />
                    {fallingPieces.map((p) => (
                        <FallingPieceComponent key={p.id} piece={p} />
                    ))}
                </Canvas>

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[8px] z-10 gap-4">
                        <div className="text-[32px] font-black text-red-500 mb-2">{t.miniGame?.gameOver || "Game Over!"}</div>
                        <div className="text-[20px] font-semibold text-gray-700">{t.miniGame?.score || "Score"}: {score}</div>
                        <button className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-none cursor-pointer transition-transform duration-150 hover:scale-105 hover:shadow-[0_4px_16px_rgba(59,130,246,0.4)] active:scale-[0.98]" onClick={resetGame}>
                            {t.miniGame?.playAgain || "Play Again"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
