import { useMemo, useState } from "react";
import type { Brick } from "../../types/brickplan";
import { demoBrickPlan } from "../../data/demoBrickPlan";

import BrickViewer from "./components/BrickViewer/BrickViewer";
import BrickPanel from "./components/BrickPanel/BrickPanel";
import { useLanguage } from "../../contexts/LanguageContext";

import "./AdultPage.css";

// ✅ LDR 테스트 뷰어를 만들었으면 사용 (없으면 이 import 지워도 됨)
import LdrViewer from "./components/LdrViewer/LdrViewer";

type ViewMode = "brickplan" | "ldr";

export default function AdultPage() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Brick | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("brickplan");

  const plan = useMemo(() => demoBrickPlan, []);

  // Ensure this path matches exactly where the file is in the public directory
  const ldrUrl = "/ldraw/models/8-10_1.ldr";

  return (
    <div
      className="adultPage"
      style={{
        backgroundColor: "#fff",
      }}
    >
      <div className="adultPage__left" style={{ paddingTop: 80 }}>
        {/* 상단 토글 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setViewMode("brickplan")}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: viewMode === "brickplan" ? "rgba(0,0,0,0.08)" : "transparent",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            BrickPlan Viewer
          </button>

          <button
            type="button"
            onClick={() => setViewMode("ldr")}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: viewMode === "ldr" ? "rgba(0,0,0,0.08)" : "transparent",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            LDR Viewer
          </button>
        </div>

        {/* 뷰어 영역 */}
        {viewMode === "brickplan" ? (
          <BrickViewer plan={plan} onSelectBrick={setSelected} />
        ) : (
          <LdrViewer url={ldrUrl} />
        )}
      </div>

      <aside className="adultPage__right">
        {/* LDR 모드일 땐 선택 패널 의미 없으니 안내 */}
        {viewMode === "brickplan" ? (
          <BrickPanel plan={plan} selected={selected} />
        ) : (
          <div style={{ padding: 16, opacity: 0.8 }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>{t.adult.ldrTest}</div>
            <div>{t.adult.ldrDesc}</div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              {t.adult.fileLabel}: <b>{ldrUrl}</b>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
