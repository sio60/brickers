'use client';

import styles from "./BrickStackMiniGame.module.css";
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
    const initialZ = 9;
    const initialY = 1;

    useFrame((state) => {
        // As the stack grows, we pull the camera back (increase Z) 
        // and move it up (increase Y) proportionally to keep the entire stack in view.
        const targetZ = initialZ + Math.max(0, stackHeight * 0.6);
        const targetY = initialY + Math.max(0, stackHeight * 0.3);

        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);

        // Look at the upper middle of the current stack to keep the base and the top visible
        const lookAtY = (FLOOR_Y + (FLOOR_Y + stackHeight)) / 2 + 2;
        state.camera.lookAt(0, lookAtY, 0);
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
        <div className={styles.brickGame}>
            {percent !== undefined && (
                <div className={styles.brickGame__progress}>
                    <div className={styles.brickGame__progressText}>
                        <span>{t.kids.generate.loading}</span>
                        <span>{percent}%</span>
                    </div>
                    <div className={styles.brickGame__progressBar}>
                        <div className={styles.brickGame__progressFill} style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            )}

            <div className={styles.brickGame__header} style={{ marginTop: percent !== undefined ? 80 : 0 }}>
                <div className={styles.brickGame__score}>
                    <span className={styles.brickGame__scoreValue}>{score}</span>
                    <span className={styles.brickGame__scoreLabel}>BRICKS</span>
                </div>
            </div>

            <div className={styles.brickGame__stage}>
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
                    <div className={styles.brickGame__overlay}>
                        <div className={styles.brickGame__overlayText}>{t.miniGame?.gameOver || "Game Over!"}</div>
                        <div className={styles.brickGame__overlayScore}>{t.miniGame?.score || "Score"}: {score}</div>
                        <button className={styles.brickGame__restart} onClick={resetGame}>
                            {t.miniGame?.playAgain || "Play Again"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
