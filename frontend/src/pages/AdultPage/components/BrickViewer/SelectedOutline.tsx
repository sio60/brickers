import * as THREE from "three";
import { useMemo } from "react";
import type { RefObject } from "react";

type Props = {
  instancedRef: RefObject<THREE.InstancedMesh | null>;
  instanceIndex: number;
};

export default function SelectedOutline({ instancedRef, instanceIndex }: Props) {
  const { pos, quat, scale } = useMemo(() => {
    const mesh = instancedRef.current;

    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);

    if (mesh) {
      mesh.getMatrixAt(instanceIndex, m);
      m.decompose(p, q, s);
    }

    return { pos: p, quat: q, scale: s };
  }, [instancedRef, instanceIndex]);

  return (
    <mesh position={pos} quaternion={quat} scale={scale}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial transparent opacity={0.9} wireframe />
    </mesh>
  );
}
