// components/kids/BrickStackMiniGame.tsx
import "./BrickStackMiniGame.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useLanguage } from "../../contexts/LanguageContext";

// ── 게임 설정 ──
const BOARD_WIDTH = 6;       // 월드 유닛 기준 보드 너비
const BRICK_HEIGHT = 0.4;    // 브릭 높이
const INITIAL_BRICK_WIDTH = 2.5;  // 초기 브릭 너비
const MOVE_SPEED = 3.5;      // 좌우 이동 속도
const FALL_SPEED = 12;       // 낙하 속도
const FLOOR_Y = -3;          // 바닥 Y 위치

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
};

type GameState = {
    x: number;           // 활성 브릭 X 위치
    y: number;           // 활성 브릭 Y 위치
    width: number;       // 활성 브릭 너비
    dir: 1 | -1;         // 이동 방향
    phase: 'moving' | 'falling' | 'landed';  // 상태 명확히 구분
    targetY: number;     // 착지 목표 Y
};

const COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
];

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ── 떨어지는 조각 컴포넌트 ──
function FallingPieceComponent({ piece }: { piece: FallingPiece }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const stateRef = useRef({ ...piece });

    useFrame((_, dt) => {
        const s = stateRef.current;
        s.velocityY -= 20 * dt; // 중력
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
            <meshStandardMaterial color="#888" transparent opacity={0.7} />
        </RoundedBox>
    );
}

// ── 메인 씬 ──
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
            // 좌우 이동
            const halfBoard = BOARD_WIDTH / 2;
            const halfWidth = state.width / 2;
            const maxX = halfBoard - halfWidth;

            state.x += state.dir * MOVE_SPEED * dt;

            if (state.x >= maxX) {
                state.x = maxX;
                state.dir = -1;
            } else if (state.x <= -maxX) {
                state.x = -maxX;
                state.dir = 1;
            }
        } else if (state.phase === 'falling') {
            // 낙하
            state.y -= FALL_SPEED * dt;

            if (state.y <= state.targetY) {
                state.y = state.targetY;
                state.phase = 'landed';
                onLanded();
            }
        }

        // 메쉬 위치 업데이트
        if (activeMesh.current) {
            activeMesh.current.position.set(state.x, state.y, 0);
        }
    });

    // 카메라 Y 위치
    const stackHeight = bricks.length * BRICK_HEIGHT;

    return (
        <>
            {/* 조명 */}
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight position={[-3, 5, -3]} intensity={0.3} />

            {/* 바닥 */}
            <mesh position={[0, FLOOR_Y - 0.2, 0]} receiveShadow>
                <boxGeometry args={[BOARD_WIDTH + 1, 0.4, 3]} />
                <meshStandardMaterial color="#e5e7eb" />
            </mesh>

            {/* 쌓인 브릭들 */}
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

            {/* 활성 브릭 */}
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

            {/* 클릭 영역 */}
            <mesh position={[0, stackHeight + FLOOR_Y + 3, 0]} onPointerDown={onDrop}>
                <boxGeometry args={[BOARD_WIDTH + 4, 15, 4]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

// ── 카메라 추적 ──
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

    // 초기 스폰 Y = 바닥 위 3칸
    const getSpawnY = useCallback((brickCount: number) => {
        return FLOOR_Y + BRICK_HEIGHT / 2 + brickCount * BRICK_HEIGHT + 3;
    }, []);

    const stateRef = useRef<GameState>({
        x: 0,
        y: getSpawnY(0),
        width: INITIAL_BRICK_WIDTH,
        dir: 1,
        phase: 'moving',
        targetY: FLOOR_Y + BRICK_HEIGHT / 2,
    });

    // 게임 리셋
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
        forceUpdate((n) => n + 1);
    }, [getSpawnY]);

    // 떨어지는 조각 정리
    useEffect(() => {
        if (fallingPieces.length === 0) return;
        const timer = setTimeout(() => {
            setFallingPieces([]);
        }, 2000);
        return () => clearTimeout(timer);
    }, [fallingPieces]);

    // 착지 완료 핸들러
    const onLanded = useCallback(() => {
        const state = stateRef.current;

        // 브릭 추가
        const newBrick: Brick = {
            id: `brick-${Date.now()}`,
            x: state.x,
            y: state.targetY,
            width: state.width,
            color: currentColor,
        };

        setBricks((prev) => {
            const updated = [...prev, newBrick];

            // 다음 브릭 스폰
            setTimeout(() => {
                const nextColor = getRandomColor();
                setCurrentColor(nextColor);
                stateRef.current = {
                    x: -BOARD_WIDTH / 2 + state.width / 2,
                    y: getSpawnY(updated.length),
                    width: state.width,
                    dir: 1,
                    phase: 'moving',
                    targetY: FLOOR_Y + BRICK_HEIGHT / 2 + updated.length * BRICK_HEIGHT,
                };
                forceUpdate((n) => n + 1);
            }, 100);

            return updated;
        });
        setScore((s) => s + 1);
    }, [currentColor, getSpawnY]);

    // 드롭 로직
    const onDrop = useCallback(() => {
        if (gameOver) return;
        const state = stateRef.current;
        if (state.phase !== 'moving') return;

        const dropX = state.x;
        const dropWidth = state.width;

        // 첫 번째 브릭
        if (bricks.length === 0) {
            state.phase = 'falling';
            state.targetY = FLOOR_Y + BRICK_HEIGHT / 2;
            forceUpdate((n) => n + 1);
            return;
        }

        // 이전 브릭과 겹침 계산
        const topBrick = bricks[bricks.length - 1];

        // Snap 보정: 중심 차이가 작으면 정중앙으로
        let finalX = dropX;
        if (Math.abs(dropX - topBrick.x) < 0.2) {
            finalX = topBrick.x;
        }

        const topLeft = topBrick.x - topBrick.width / 2;
        const topRight = topBrick.x + topBrick.width / 2;
        const dropLeft = finalX - dropWidth / 2;
        const dropRight = finalX + dropWidth / 2;

        const overlapLeft = Math.max(topLeft, dropLeft);
        const overlapRight = Math.min(topRight, dropRight);
        const overlapWidth = overlapRight - overlapLeft;

        // 겹치지 않음 = 게임 오버
        if (overlapWidth <= 0) {
            setGameOver(true);
            setFallingPieces([{
                id: `fall-${Date.now()}`,
                x: dropX,
                y: state.y,
                width: dropWidth,
                velocityX: state.dir * 2,
                velocityY: 0,
                rotation: 0,
                rotationSpeed: state.dir * 3,
            }]);
            state.phase = 'landed'; // 활성 브릭 숨김
            forceUpdate((n) => n + 1);
            return;
        }

        // 겹치는 부분만 남김
        const overlapCenterX = (overlapLeft + overlapRight) / 2;
        const newY = topBrick.y + BRICK_HEIGHT;

        // 잘린 조각 생성
        const cutPieces: FallingPiece[] = [];

        // 왼쪽 미스
        if (dropLeft < overlapLeft) {
            const cutWidth = overlapLeft - dropLeft;
            const cutX = dropLeft + cutWidth / 2;
            cutPieces.push({
                id: `cut-left-${Date.now()}`,
                x: cutX,
                y: state.y,
                width: cutWidth,
                velocityX: -2,
                velocityY: 1,
                rotation: 0,
                rotationSpeed: -4,
            });
        }

        // 오른쪽 미스
        if (dropRight > overlapRight) {
            const cutWidth = dropRight - overlapRight;
            const cutX = overlapRight + cutWidth / 2;
            cutPieces.push({
                id: `cut-right-${Date.now()}`,
                x: cutX,
                y: state.y,
                width: cutWidth,
                velocityX: 2,
                velocityY: 1,
                rotation: 0,
                rotationSpeed: 4,
            });
        }

        if (cutPieces.length > 0) {
            setFallingPieces(cutPieces);
        }

        // 상태 업데이트
        state.x = overlapCenterX;
        state.width = overlapWidth;
        state.phase = 'falling';
        state.targetY = newY;
        forceUpdate((n) => n + 1);
    }, [bricks, gameOver]);

    const stackHeight = bricks.length * BRICK_HEIGHT;

    return (
        <div className="brickGame">
            {/* Progress Overlay */}
            {percent !== undefined && (
                <div className="brickGame__progress">
                    <div className="brickGame__progressText">
                        <span>{t.kids.generate.loading}</span>
                        <span>{percent}%</span>
                    </div>
                    <div className="brickGame__progressBar">
                        <div className="brickGame__progressFill" style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            )}

            <div className="brickGame__header" style={{ marginTop: percent !== undefined ? 80 : 0 }}>
                <div className="brickGame__score">
                    <span className="brickGame__scoreValue">{score}</span>
                    <span className="brickGame__scoreLabel">BRICKS</span>
                </div>
            </div>

            <div className="brickGame__stage">
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
                    <div className="brickGame__overlay">
                        <div className="brickGame__overlayText">{t.miniGame?.gameOver || "Game Over!"}</div>
                        <div className="brickGame__overlayScore">{t.miniGame?.score || "Score"}: {score}</div>
                        <button className="brickGame__restart" onClick={resetGame}>
                            {t.miniGame?.playAgain || "Play Again"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
