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
    color: string;
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
            <meshStandardMaterial color={piece.color} transparent opacity={0.8} />
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

ev
    useEffect(() => {
        if (fallingPieces.length === 0) return;
        const timer = setTimeout(() => {
            setFallingPieces((prev) => prev.slice(5)); // Keep list manageable
        }, 3000);
        return () => clearTimeout(timer);
    }, [fallingPieces]);


    // 착지 완료 핸들러 (컷팅 로직 포함)
    const onLanded = useCallback(() => {
        const state = stateRef.current;

        // 1. 첫 번째 브릭은 항상 성공
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
            spawnNext(state.width, updatedCount => updatedCount);

            return;
        }

        // 2. 이전 브릭과 겹침 판정
        const topBrick = bricks[bricks.length - 1];


        // Snap: 아주 미세한 차이는 정렬해줌 (매너 판정)
        let finalX = state.x;
   finalX = topBrick.x;
        }

        const topLeft = topBrick.x - topBrick.width / 2;
        const topRight = topBrick.x + topBrick.width / 2;
        const dropLeft = finalX - state.width / 2;
        const dropRight = finalX + state.width / 2;

        const overlapLeft = Math.max(topLeft, dropLeft);
        const overlapRight = Math.min(topRight, dropRight);
        const overlapWidth = overlapRight - overlapLeft;

        // 3. 겹치지 않으면 게임 오버
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

        // 4. 잘리는 조각 처리
        const newFalling: FallingPiece[] = [];
        const isLeftMiss = dropLeft < overlapLeft;
        const isRightMiss = dropRight > overlapRight;

        if (isLeftMiss) {

            const cutWidth = overlapLeft - dropLeft;
            const cutX = dropLeft + cutWidth / 2;
            newFalling.push({
                id: `cut-left-${Date.now()}`,
                x: cutX,
                y: state.y,
                width: cutWidth,
                velocityX: -2,
                velocityY: 1,
                rotation: 0,
                rotationSpeed: -4,
                color: currentColor,
            });
        }

        if (isRightMiss) {
            const cutWidth = dropRight - overlapRight;
            const cutX = overlapRight + cutWidth / 2;
            newFalling.push({
                id: `cut-right-${Date.now()}`,
                x: cutX,
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


        // 5. 겹친 부분만 브릭으로 추가
        const overlapCenterX = (overlapLeft + overlapRight) / 2;
        const newBrick: Brick = {
            id: `brick-${Date.now()}`,
            x: overlapCenterX,
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
    }, [bricks, currentColor]);

    // 다음 브릭 생성 헬퍼
    const spawnNext = (width: number, count: number) => {
        setTimeout(() => {
            const nextColor = getRandomColor();
            setCurrentColor(nextColor);
            stateRef.current = {
                x: -BOARD_WIDTH / 2 + (Math.random() * 0.5), // 약간의 랜덤성
                y: getSpawnY(count),
                width: width,
                dir: Math.random() > 0.5 ? 1 : -1,
                phase: 'moving',
                targetY: FLOOR_Y + BRICK_HEIGHT / 2 + count * BRICK_HEIGHT,
            };
            forceUpdate((n) => n + 1);
        }, 100);
    };

    const onDrop = useCallback(() => {
        if (gameOver) return;
        const state = stateRef.current;
        if (state.phase !== 'moving') return;

        state.phase = 'falling';
        forceUpdate((n) => n + 1);
    }, [gameOver]);


    const stackHeight = bricks.length * BRICK_HEIGHT;

    return (
        <div className="brickGame">
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
