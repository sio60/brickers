
export type Vec3 = [number, number, number]; // [x, y, z]
export type RGB = [number, number, number]; // 0~255

export type RotY = 0 | 90 | 180 | 270;

export type BrickKind =
  | "brick"
  | "plate"
  | "tile"
  | "slope"
  | "custom"; // 확장 대비

export interface BrickColor {
  id: string;           // ex) "red-01" or "ldr:4"
  name?: string;
  rgb: RGB;             // 렌더링용
  ldrawColorId?: number; // export용(선택)
}

export interface Brick {
  id: string;

  // 최소 MVP
  kind: BrickKind;
  sizeStud: [number, number]; // [w, d] in studs (예: 2x4 => [2,4])
  heightPlate: number;        // 높이 in plates (brick=3, plate=1 등)
  pos: Vec3;                  // [xStud, yPlate, zStud] (y는 plate 단위)
  rotY: RotY;                 // y축 회전
  color: BrickColor;

  // UX/조립 단위(선택)
  layer?: number;             // 보통 y 기반 레이어
  step?: number;              // 조립 단계
  groupId?: string;           // 클러스터/부위 그룹
  tags?: string[];

  // 확장: 물리/검증 지표
  metrics?: {
    supportScore?: number; // 0~1
    overhangRatio?: number; // 0~1
    contactStuds?: number; // 붙은 스터드 수
    isFloating?: boolean;
    centerOfMass?: Vec3; // 참고용
  };

  // 확장: 위반/경고 링크
  violationIds?: string[];
}

export type ViolationType =
  | "floating"
  | "overhang"
  | "unsupported"
  | "collision"
  | "weak_connection"
  | "custom";

export interface Violation {
  id: string;
  type: ViolationType;
  severity: 1 | 2 | 3 | 4 | 5;
  message: string;

  // 어디가 문제인지
  at?: Vec3;                // 대표 좌표
  brickIds?: string[];      // 관련 브릭들

  // 개선 제안(선택)
  suggestion?: {
    message: string;
    addBricks?: Partial<Brick>[];
    removeBrickIds?: string[];
  };
}

export interface Cluster {
  id: string;
  brickIds: string[];
  kind?: "component" | "floating" | "support";
  score?: number; // 0~1
}

export interface BrickPlanMeta {
  name?: string;
  createdAt?: string; // ISO
  source?: {
    type: "image" | "glb" | "manual" | "unknown";
    files?: string[];
  };
  notes?: string;
}

export interface BrickPlanUnits {
  // 렌더링 비율용(레고 비율: plateHeightMm(3.2) / studSizeMm(8) = 0.4)
  studSizeMm?: number;    // default 8
  plateHeightMm?: number; // default 3.2
}

export interface BrickPlan {
  version: string; // "0.1"
  meta?: BrickPlanMeta;
  units?: BrickPlanUnits;

  bricks: Brick[];

  // 확장: 분석 리포트(선택)
  analysis?: {
    violations?: Violation[];
    clusters?: Cluster[];
    stats?: {
      brickCount?: number;
      byColor?: Record<string, number>;
      byKind?: Record<string, number>;
    };
  };
}
