// src/pages/AdultPage/data/demoBrickPlan.ts
import type { BrickPlan } from "../types/brickplan";

export const demoBrickPlan: BrickPlan = {
  version: "0.1",
  meta: { name: "Demo BrickPlan", source: { type: "unknown" } },
  units: { studSizeMm: 8, plateHeightMm: 3.2 },
  bricks: [
    {
      id: "b-001",
      kind: "brick",
      sizeStud: [2, 4],
      heightPlate: 3,
      pos: [0, 0, 0],
      rotY: 0,
      color: { id: "red", rgb: [220, 60, 60] },
      layer: 0,
      step: 0,
      metrics: { supportScore: 0.9, contactStuds: 8 },
    },
    {
      id: "b-002",
      kind: "brick",
      sizeStud: [2, 2],
      heightPlate: 3,
      pos: [3, 0, 1],
      rotY: 90,
      color: { id: "blue", rgb: [60, 120, 220] },
      layer: 0,
      step: 0,
      metrics: { supportScore: 0.7, contactStuds: 4 },
    },
    {
      id: "b-003",
      kind: "plate",
      sizeStud: [1, 4],
      heightPlate: 1,
      pos: [1, 3, 0], // y=3 plates 위에 얹음
      rotY: 0,
      color: { id: "yellow", rgb: [240, 200, 60] },
      layer: 1,
      step: 1,
      metrics: { supportScore: 0.3, overhangRatio: 0.6, isFloating: false },
      violationIds: ["v-001"],
    },
  ],
  analysis: {
    violations: [
      {
        id: "v-001",
        type: "overhang",
        severity: 3,
        message: "오버행 비율이 높아 지지 보강이 필요합니다.",
        brickIds: ["b-003"],
        at: [1, 3, 0],
        suggestion: { message: "아래에 1x2 브릭으로 지지 추가를 고려하세요." },
      },
    ],
    clusters: [{ id: "c-001", brickIds: ["b-001", "b-002", "b-003"], kind: "component", score: 0.8 }],
  },
};
