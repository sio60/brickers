import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BrickPlan, Brick } from "../../../../types/brickplan";
import SelectedOutline from "./SelectedOutline";
import "./BrickViewer.css";

type Props = {
  plan: BrickPlan;
  onSelectBrick?: (brick: Brick | null) => void;
};

function rgbToColor(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

export default function BrickViewer({ plan, onSelectBrick }: Props) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 레고 비율(plate/stud = 3.2/8 = 0.4)
  const plateToWorld = useMemo(() => {
    const stud = plan.units?.studSizeMm ?? 8;
    const plate = plan.units?.plateHeightMm ?? 3.2;
    return plate / stud; // 0.4
  }, [plan.units]);

  // 바운딩 박스(카메라 대충 잡는 용도)
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const b of plan.bricks) {
      const [w, d] = b.sizeStud;
      const h = b.heightPlate * plateToWorld;
      const x = b.pos[0];
      const y = b.pos[1] * plateToWorld;
      const z = b.pos[2];

      // centered box => half extents
      const hx = w / 2;
      const hy = h / 2;
      const hz = d / 2;

      minX = Math.min(minX, x - hx);
      maxX = Math.max(maxX, x + hx);
      minY = Math.min(minY, y - hy);
      maxY = Math.max(maxY, y + hy);
      minZ = Math.min(minZ, z - hz);
      maxZ = Math.max(maxZ, z + hz);
    }

    if (!isFinite(minX)) return null;
    const size = new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ);
    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    return { size, center };
  }, [plan.bricks, plateToWorld]);

  // 인스턴스 매트릭스/색상 세팅
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();

    plan.bricks.forEach((b, i) => {
      const [w, d] = b.sizeStud;
      const h = b.heightPlate * plateToWorld;

      // pos: [xStud, yPlate, zStud]
      const x = b.pos[0];
      const y = b.pos[1] * plateToWorld;
      const z = b.pos[2];

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, THREE.MathUtils.degToRad(b.rotY), 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);

      const c = rgbToColor(b.color.rgb);
      mesh.setColorAt(i, c);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [plan.bricks, plateToWorld]);

  // 선택 이벤트
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const idx: number | undefined = e.instanceId;
    if (typeof idx !== "number") return;

    setSelectedIndex(idx);
    onSelectBrick?.(plan.bricks[idx] ?? null);
  };

  const handleBackgroundClick = () => {
    setSelectedIndex(null);
    onSelectBrick?.(null);
  };

  // 카메라 초기 포지션(대충 안정적인 거리)
  const cameraPos = useMemo(() => {
    if (!bounds) return [0, 6, 10] as const;
    const maxDim = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
    return [bounds.center.x + maxDim * 1.2, bounds.center.y + maxDim * 0.9, bounds.center.z + maxDim * 1.2] as const;
  }, [bounds]);

  return (
    <div className="brickViewer">
      <Canvas camera={{ position: cameraPos, fov: 45 }} onPointerMissed={handleBackgroundClick}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 18, 10]} intensity={1.2} />

        {/* 인스턴스: 기본 단순 박스(브릭 프리뷰) */}
        <instancedMesh
          ref={meshRef}
          args={[undefined as any, undefined as any, plan.bricks.length]}
          onPointerDown={handlePointerDown}
        >
          {/* unit box (scale은 matrix로 개별 적용) */}
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial vertexColors />
        </instancedMesh>

        {/* 선택 하이라이트 */}
        {selectedIndex !== null && (
          <SelectedOutline instancedRef={meshRef} instanceIndex={selectedIndex} />
        )}

        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
}
