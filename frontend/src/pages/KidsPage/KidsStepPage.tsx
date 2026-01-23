import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const CDN_BASE =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (obj.geometry) obj.geometry.dispose?.();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
    else mat?.dispose?.();
  });
}

function buildCumulativeStepTexts(ldrText: string): string[] {
  const lines = ldrText.replace(/\r\n/g, "\n").split("\n");

  const segments: string[][] = [];
  let cur: string[] = [];
  let hasStep = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
      hasStep = true;
      segments.push(cur);
      cur = [];
      continue;
    }
    cur.push(raw);
  }
  segments.push(cur);

  if (!hasStep) return [ldrText];

  const out: string[] = [];
  let acc: string[] = [];
  for (const seg of segments) {
    acc = acc.concat(seg);
    out.push(acc.join("\n"));
  }
  return out;
}

function LdrModel({
  url,
  overrideMainLdrUrl,
  partsLibraryPath = CDN_BASE,
  ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
  onLoaded,
  onError,
}: {
  url: string; // 원본 메인 LDR (상대경로 기준용)
  overrideMainLdrUrl?: string; // 현재 스텝용 blob url
  partsLibraryPath?: string;
  ldconfigUrl?: string;
  onLoaded?: () => void;
  onError?: (e: unknown) => void;
}) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    const mainAbs = (() => {
      try {
        return new URL(url, window.location.href).href;
      } catch {
        return url;
      }
    })();

    manager.setURLModifier((u) => {
      let fixed = u.replace(/\\/g, "/");

      // ✅ 메인 LDR만 blob으로 치환
      if (overrideMainLdrUrl) {
        try {
          const abs = new URL(fixed, window.location.href).href;
          if (abs === mainAbs) return overrideMainLdrUrl;
        } catch {
          // relative path 일 수도 있음 → 아래에서 처리
        }
      }

      // ✅ blob 상태에서 submodel 상대경로 깨지는 거 방지:
      const isAbsolute =
        fixed.startsWith("http://") ||
        fixed.startsWith("https://") ||
        fixed.startsWith("blob:") ||
        fixed.startsWith("/") ||
        fixed.includes(":");

      if (overrideMainLdrUrl && !isAbsolute) {
        try {
          fixed = new URL(fixed, url).href;
        } catch {}
      }

      // CDN parts/p 보정
      if (
        fixed.includes("ldraw-parts-library") &&
        !fixed.includes("/parts/") &&
        !fixed.includes("/p/") &&
        !fixed.includes("LDConfig.ldr")
      ) {
        if (fixed.endsWith(".dat")) {
          const filename = fixed.split("/").pop() || "";
          const isPart = /^[0-9]/.test(filename);
          fixed = fixed.replace(
            "/ldraw/",
            isPart ? "/ldraw/parts/" : "/ldraw/p/"
          );
        }
      }

      return fixed;
    });

    manager.onError = (path) => console.error("[LDraw] failed to load:", path);

    const l = new LDrawLoader(manager);
    l.setPartsLibraryPath(partsLibraryPath);
    l.smoothNormals = true;

    try {
      (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any);
    } catch {}

    return l;
  }, [partsLibraryPath, url, overrideMainLdrUrl]);

  const [group, setGroup] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    let prev: THREE.Group | null = null;

    (async () => {
      setGroup(null);

      await loader.preloadMaterials(ldconfigUrl);
      const g = await loader.loadAsync(url);

      if (cancelled) {
        disposeObject3D(g);
        return;
      }

      // LDraw -> Three 축 보정
      g.rotation.x = Math.PI;

      prev = g;
      setGroup(g);
      onLoaded?.();
    })().catch((e) => {
      console.error("[LDraw] load failed:", e);
      onError?.(e);
    });

    return () => {
      cancelled = true;
      if (prev) disposeObject3D(prev);
    };
  }, [url, ldconfigUrl, loader, onLoaded, onError]);

  if (!group) return null;

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={group} />
    </Bounds>
  );
}

export default function KidsStepPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const url = params.get("url") || "";

  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
  const blobRef = useRef<string[]>([]);

  const revokeAll = (arr: string[]) => {
    arr.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!url) return;

      setLoading(true);
      setStepIdx(0);

      const res = await fetch(url);
      const text = await res.text();
      const stepTexts = buildCumulativeStepTexts(text);

      const blobs = stepTexts.map((t) =>
        URL.createObjectURL(new Blob([t], { type: "text/plain" }))
      );

      if (!alive) {
        revokeAll(blobs);
        return;
      }

      revokeAll(blobRef.current);
      blobRef.current = blobs;
      setStepBlobUrls(blobs);

      // step 텍스트 준비 끝났다고 해서 로딩 끄면, Canvas 로딩 순간 깜빡임 있을 수 있어서
      // 실제 모델 로딩 onLoaded에서 끄는 게 안정적임.
    })().catch((e) => {
      console.error("[KidsStepPage] build steps failed:", e);
      revokeAll(blobRef.current);
      blobRef.current = [];
      setStepBlobUrls([]);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    return () => revokeAll(blobRef.current);
  }, []);

  if (!url) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => nav(-1)}>← 뒤로</button>
        <div style={{ marginTop: 12 }}>스텝을 볼 URL이 없습니다.</div>
      </div>
    );
  }

  const total = stepBlobUrls.length || 1;
  const overrideMainLdrUrl =
    stepBlobUrls.length
      ? stepBlobUrls[Math.min(stepIdx, stepBlobUrls.length - 1)]
      : undefined;

  const canPrev = stepIdx > 0;
  const canNext = stepIdx < total - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 상단바 */}
      <div
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          onClick={() => nav(-1)}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div style={{ fontWeight: 900, letterSpacing: 0.5, opacity: 0.9 }}>
          BRICKERS
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            fontWeight: 900,
          }}
        >
          STEP {stepIdx + 1} / {total}
        </div>
      </div>

      {/* 중앙 카드 */}
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "28px 20px 36px",
        }}
      >
        <div
          style={{
            width: "min(1100px, 92vw)",
            aspectRatio: "16 / 9",
            borderRadius: 18,
            background: "rgba(255,255,255,0.92)",
            border: "2px solid rgba(0,0,0,0.55)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 카드 타이틀 */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.9)",
              fontWeight: 900,
            }}
          >
            Brick Preview
          </div>

          {/* 로딩 오버레이 */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(4px)",
                fontWeight: 900,
                color: "#666",
              }}
            >
              스텝 로딩 중...
            </div>
          )}

          {/* Canvas */}
          <div style={{ position: "absolute", inset: 0 }}>
            <Canvas camera={{ position: [220, 0, 220], fov: 45 }} dpr={[1, 2]}>
              <ambientLight intensity={0.9} />
              <directionalLight position={[3, 5, 2]} intensity={1.0} />

              <LdrModel
                url={url}
                overrideMainLdrUrl={overrideMainLdrUrl}
                onLoaded={() => setLoading(false)}
                onError={() => setLoading(false)}
              />

              <OrbitControls enablePan={false} enableZoom />
            </Canvas>
          </div>

          {/* 카드 안 버튼 */}
          <button
            disabled={!canPrev}
            onClick={() => {
              if (!canPrev) return;
              setLoading(true);
              setStepIdx((v) => Math.max(0, v - 1));
            }}
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              zIndex: 7,
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.92)",
              boxShadow: canPrev ? "0 10px 18px rgba(0,0,0,0.10)" : "none",
              cursor: canPrev ? "pointer" : "not-allowed",
              fontWeight: 900,
              opacity: canPrev ? 1 : 0.45,
            }}
          >
            ← PREV
          </button>

          <button
            disabled={!canNext}
            onClick={() => {
              if (!canNext) return;
              setLoading(true);
              setStepIdx((v) => Math.min(total - 1, v + 1));
            }}
            style={{
              position: "absolute",
              right: 16,
              bottom: 16,
              zIndex: 7,
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.92)",
              boxShadow: canNext ? "0 10px 18px rgba(0,0,0,0.10)" : "none",
              cursor: canNext ? "pointer" : "not-allowed",
              fontWeight: 900,
              opacity: canNext ? 1 : 0.45,
            }}
          >
            NEXT →
          </button>
        </div>
      </div>
    </div>
  );
}
