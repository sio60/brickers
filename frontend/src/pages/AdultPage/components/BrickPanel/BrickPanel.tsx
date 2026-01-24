import type { Brick, BrickPlan, Violation } from "../../../../types/brickplan";
import { useLanguage } from "../../../../contexts/LanguageContext";

type Props = {
  plan: BrickPlan;
  selected: Brick | null;
};

export default function BrickPanel({ plan, selected }: Props) {
  const { t } = useLanguage();
  const violationsById = new Map<string, Violation>();
  plan.analysis?.violations?.forEach(v => violationsById.set(v.id, v));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{t.adult.panel.title}</div>

      {!selected ? (
        <div style={{ opacity: 0.75 }}>{t.adult.panel.hint}</div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            <Row k="id" v={selected.id} />
            <Row k="kind" v={selected.kind} />
            <Row k="size" v={`${selected.sizeStud[0]} x ${selected.sizeStud[1]} studs`} />
            <Row k="height" v={`${selected.heightPlate} plates`} />
            <Row k="pos" v={`[${selected.pos.join(", ")}] (xStud,yPlate,zStud)`} />
            <Row k="rotY" v={`${selected.rotY}°`} />
            <Row k="color" v={`${selected.color.id} rgb(${selected.color.rgb.join(", ")})`} />
            {selected.layer !== undefined && <Row k="layer" v={`${selected.layer}`} />}
            {selected.step !== undefined && <Row k="step" v={`${selected.step}`} />}
          </div>

          {selected.metrics && (
            <>
              <div style={{ marginTop: 14, fontWeight: 800 }}>Metrics</div>
              <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                {selected.metrics.supportScore !== undefined && <Row k="supportScore" v={`${selected.metrics.supportScore}`} />}
                {selected.metrics.overhangRatio !== undefined && <Row k="overhangRatio" v={`${selected.metrics.overhangRatio}`} />}
                {selected.metrics.contactStuds !== undefined && <Row k="contactStuds" v={`${selected.metrics.contactStuds}`} />}
                {selected.metrics.isFloating !== undefined && <Row k="isFloating" v={`${selected.metrics.isFloating}`} />}
              </div>
            </>
          )}

          {selected.violationIds?.length ? (
            <>
              <div style={{ marginTop: 14, fontWeight: 800 }}>Violations</div>
              <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                {selected.violationIds.map((id) => {
                  const v = violationsById.get(id);
                  if (!v) return <div key={id}>- {id}</div>;
                  return (
                    <div key={id} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>{v.type} (sev {v.severity})</div>
                      <div style={{ opacity: 0.9, marginTop: 4 }}>{v.message}</div>
                      {v.suggestion?.message && (
                        <div style={{ marginTop: 6, opacity: 0.9 }}>👉 {v.suggestion.message}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ width: 92, opacity: 0.7 }}>{k}</div>
      <div style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
