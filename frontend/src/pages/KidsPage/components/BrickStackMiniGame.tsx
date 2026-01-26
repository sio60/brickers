// src/pages/KidsPage/components/BrickStackMiniGame.tsx
import "./BrickStackMiniGame.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// ── 게임 설정 ──
const BOARD_WIDTH = 6;       // 월드 유닛 기준 보드 너비
const BRICK_HEIGHT = 0.4;    // 브릭 높이
const INITIAL_BRICK_WIDTH = 2.5;  // 초기 브릭 너비
const MOVE_SPEED = 3.5;      // 좌우 이동 속도
const FALL_SPEED = 12;       // 낙하 속도
const INITIAL_SPAWN_Y = 3;   // 초기 스폰 높이
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

type ActiveBrick = {
  x: number;
  width: number;
  dir: 1 | -1;
  falling: boolean;
  targetY: number;
  spawnY: number;
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
  const stateRef = useRef(piece);

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
  activeRef,
  onDrop,
  currentColor,
  gameOver,
}: {
  bricks: Brick[];
  activeRef: React.MutableRefObject<ActiveBrick>;
  onDrop: () => void;
  currentColor: string;
  gameOver: boolean;
}) {
  const activeMesh = useRef<THREE.Mesh>(null);

  useFrame((state, dt) => {
    // 1. 카메라 팔로우 로직
    const stackHeight = bricks.length * BRICK_HEIGHT;
    // 쌓인 높이에 따라 카메라 Y 목표값 계산 (기본 0, 쌓일수록 위로)
    const targetCamY = Math.max(0, stackHeight - 2);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 0.05);
    state.camera.lookAt(0, state.camera.position.y - 1, 0);

    const a = activeRef.current;
    if (gameOver) return;

    if (!a.falling) {
      // 좌우 이동
      const halfBoard = BOARD_WIDTH / 2;
      const halfWidth = a.width / 2;
      const maxX = halfBoard - halfWidth;

      a.x += a.dir * MOVE_SPEED * dt;

      if (a.x >= maxX) {
        a.x = maxX;
        a.dir = -1;
      } else if (a.x <= -maxX) {
        a.x = -maxX;
        a.dir = 1;
      }
    } else {
      // 낙하
      const targetY = a.targetY;
      const currentY = activeMesh.current?.position.y ?? a.spawnY;
      const newY = currentY - FALL_SPEED * dt;

      if (newY <= targetY) {
        // 착지
        if (activeMesh.current) {
          activeMesh.current.position.y = targetY;
        }
      } else if (activeMesh.current) {
        activeMesh.current.position.y = newY;
      }
    }

    // 메쉬 위치 업데이트 (이동 중일 때)
    if (activeMesh.current && !a.falling) {
      activeMesh.current.position.set(a.x, a.spawnY, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 5, 2]} intensity={50} />

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
      {!gameOver && (
        <RoundedBox
          ref={activeMesh as any}
          args={[activeRef.current.width - 0.05, BRICK_HEIGHT - 0.05, 1]}
          radius={0.1}
          smoothness={4}
          position={[activeRef.current.x, activeRef.current.spawnY, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={currentColor} />
        </RoundedBox>
      )}

      {/* 클릭 영역 (카메라 따라다니도록 충분히 크게 설정) */}
      <mesh position={[0, activeRef.current.spawnY, 0]} onPointerDown={onDrop}>
        <boxGeometry args={[BOARD_WIDTH + 10, 20, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

export default function BrickStackMiniGame() {
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [fallingPieces, setFallingPieces] = useState<FallingPiece[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentColor, setCurrentColor] = useState(getRandomColor());

  const activeRef = useRef<ActiveBrick>({
    x: 0,
    width: INITIAL_BRICK_WIDTH,
    dir: 1,
    falling: false,
    targetY: FLOOR_Y + BRICK_HEIGHT / 2,
    spawnY: INITIAL_SPAWN_Y,
  });

  const resetGame = useCallback(() => {
    setBricks([]);
    setFallingPieces([]);
    setScore(0);
    setGameOver(false);
    setCurrentColor(getRandomColor());
    activeRef.current = {
      x: 0,
      width: INITIAL_BRICK_WIDTH,
      dir: 1,
      falling: false,
      targetY: FLOOR_Y + BRICK_HEIGHT / 2,
      spawnY: INITIAL_SPAWN_Y,
    };
  }, []);

  useEffect(() => {
    if (fallingPieces.length === 0) return;
    const timer = setTimeout(() => {
      setFallingPieces([]);
    }, 2000);
    return () => clearTimeout(timer);
  }, [fallingPieces.length]);

  const onDrop = useCallback(() => {
    if (gameOver) return;
    const a = activeRef.current;
    if (a.falling) return;

    const dropX = a.x;
    const dropWidth = a.width;

    if (bricks.length === 0) {
      a.falling = true;
      a.targetY = FLOOR_Y + BRICK_HEIGHT / 2;

      setTimeout(() => {
        const newBrick: Brick = {
          id: `${Date.now()}`,
          x: dropX,
          y: FLOOR_Y + BRICK_HEIGHT / 2,
          width: dropWidth,
          color: currentColor,
        };
        setBricks([newBrick]);
        setScore(1);

        const nextColor = getRandomColor();
        setCurrentColor(nextColor);
        activeRef.current = {
          x: -BOARD_WIDTH / 2 + dropWidth / 2,
          width: dropWidth,
          dir: 1,
          falling: false,
          targetY: FLOOR_Y + BRICK_HEIGHT / 2 + BRICK_HEIGHT,
          spawnY: INITIAL_SPAWN_Y,
        };
      }, 300);
      return;
    }

    const topBrick = bricks[bricks.length - 1];
    const topLeft = topBrick.x - topBrick.width / 2;
    const topRight = topBrick.x + topBrick.width / 2;
    const dropLeft = dropX - dropWidth / 2;
    const dropRight = dropX + dropWidth / 2;

    const overlapLeft = Math.max(topLeft, dropLeft);
    const overlapRight = Math.min(topRight, dropRight);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0.1) { // 너무 작게 남으면 게임오버
      setGameOver(true);
      setFallingPieces([{
        id: `fall-${Date.now()}`,
        x: dropX,
        y: a.spawnY,
        width: dropWidth,
        velocityX: a.dir * 2,
        velocityY: 0,
        rotation: 0,
        rotationSpeed: a.dir * 3,
      }]);
      return;
    }

    const overlapCenterX = (overlapLeft + overlapRight) / 2;
    const newY = topBrick.y + BRICK_HEIGHT;

    a.falling = true;
    a.targetY = newY;

    const cutPieces: FallingPiece[] = [];
    if (dropLeft < overlapLeft) {
      const cutWidth = overlapLeft - dropLeft;
      cutPieces.push({
        id: `cut-left-${Date.now()}`,
        x: dropLeft + cutWidth / 2,
        y: newY,
        width: cutWidth,
        velocityX: -2,
        velocityY: 1,
        rotation: 0,
        rotationSpeed: -4,
      });
    }
    if (dropRight > overlapRight) {
      const cutWidth = dropRight - overlapRight;
      cutPieces.push({
        id: `cut-right-${Date.now()}`,
        x: overlapRight + cutWidth / 2,
        y: newY,
        width: cutWidth,
        velocityX: 2,
        velocityY: 1,
        rotation: 0,
        rotationSpeed: 4,
      });
    }

    if (cutPieces.length > 0) {
      setFallingPieces((prev) => [...prev, ...cutPieces]);
    }

    setTimeout(() => {
      const newBrick: Brick = {
        id: `${Date.now()}`,
        x: overlapCenterX,
        y: newY,
        width: overlapWidth,
        color: currentColor,
      };

      setBricks((prev) => [...prev, newBrick]);
      setScore((s) => s + 1);

      const nextColor = getRandomColor();
      setCurrentColor(nextColor);

      // 다음 스폰 위치 설정 (현재 높이 + N)
      const nextSpawnY = newY + INITIAL_SPAWN_Y - FLOOR_Y - (BRICK_HEIGHT / 2);

      activeRef.current = {
        x: -BOARD_WIDTH / 2 + overlapWidth / 2,
        width: overlapWidth,
        dir: 1,
        falling: false,
        targetY: newY + BRICK_HEIGHT,
        spawnY: nextSpawnY,
      };
    }, 250);
  }, [bricks, gameOver, currentColor]);

  return (
    <div className="brickGame">
      <div className="brickGame__header">
        <div className="brickGame__score">{score}</div>
        {gameOver && (
          <button className="brickGame__restart" onClick={resetGame}>
            Play Again
          </button>
        )}
      </div>

      <div className="brickGame__stage">
        <Canvas shadows camera={{ position: [0, 0, 9], fov: 50 }}>
          <Scene
            bricks={bricks}
            activeRef={activeRef}
            onDrop={onDrop}
            currentColor={currentColor}
            gameOver={gameOver}
          />
          {fallingPieces.map((p) => (
            <FallingPieceComponent key={p.id} piece={p} />
          ))}
        </Canvas>

        {gameOver && (
          <div className="brickGame__overlay">
            <div className="brickGame__overlayText">Game Over!</div>
            <div className="brickGame__overlayScore">Score: {score}</div>
          </div>
        )}
      </div>
    </div>
  );
}
