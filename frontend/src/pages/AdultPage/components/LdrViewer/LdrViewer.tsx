import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { verifyPhysicality } from "../../../../api/physicalTest";

type Props = {
  url: string; // "/ldraw/models/car.ldr"
  partsLibraryPath?: string;
  ldconfigUrl?: string;
};

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (obj.geometry) obj.geometry.dispose?.();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
    else mat?.dispose?.();
    if (obj.texture) obj.texture.dispose?.();
  });
}

// ✅ 0 STEP / 0 ROTSTEP 기준 누적 텍스트 배열
function splitLdrawStepsToCumulative(text: string) {
  const lines = text.split(/\r?\n/);
  const steps: string[][] = [[]];

  for (const line of lines) {
    if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
      steps.push([]);
      continue;
    }
    steps[steps.length - 1].push(line);
  }

  const cumulative = steps
    .map((_, i) => steps.slice(0, i + 1).flat().join("\n"))
    .filter((s) => s.trim().length > 0);

  return cumulative.length ? cumulative : [text];
}

// ✅ "1 ..." 라인(=부품 추가) 기준 누적 텍스트 배열
function splitLdrawPartsToCumulative(text: string) {
  const lines = text.split(/\r?\n/);
  const acc: string[] = [];
  const frames: string[] = [];

  for (const line of lines) {
    acc.push(line);
    if (/^1\s+/.test(line)) {
      frames.push(acc.join("\n"));
    }
  }

  return frames.length ? frames : [text];
}

// ✅ gkjohnson mirror CDN
const CDN_BASE =
  "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

function LdrModel({
  url,
  partsLibraryPath = CDN_BASE,
  ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
  blueprintMode = false,
  onReady,
}: Props & { blueprintMode?: boolean; onReady?: () => void }) {
  const loader = useMemo(() => {
    THREE.Cache.enabled = true;

    const manager = new THREE.LoadingManager();

    manager.setURLModifier((u) => {
      let fixed = u.replace(/\\/g, "/");

      // ✅ CDN 쓸 때 parts/p 폴더 보정 (기존 로직)
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
    } catch { }

    return l;
  }, [partsLibraryPath]);

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

      // ✅ 도면 느낌: 컬러 유지 + 엣지 강조 + 표면 반사 줄이기
      g.traverse((obj: any) => {
        const mat = obj.material;
        if (!mat) return;

        const tweak = (m: any) => {
          // 라인 강조
          if (m.isLineBasicMaterial) {
            m.transparent = true;
            m.opacity = blueprintMode ? 0.6 : 0.25;
            m.depthTest = true;

            // 브라우저 제한 많지만 지원 환경에선 굵기 먹음
            if ("linewidth" in m) m.linewidth = blueprintMode ? 2 : 1;

            m.needsUpdate = true;
          }

          // 표면을 플랫하게(컬러 유지)
          if (
            blueprintMode &&
            (m.isMeshStandardMaterial || m.isMeshPhongMaterial)
          ) {
            if ("metalness" in m) m.metalness = 0;
            if ("roughness" in m) m.roughness = 1;
            if ("shininess" in m) m.shininess = 0;
            m.needsUpdate = true;
          }
        };

        if (Array.isArray(mat)) mat.forEach(tweak);
        else tweak(mat);
      });

      // LDraw -> Three 축 보정
      g.rotation.x = Math.PI;

      prev = g;
      setGroup(g);

      // ✅ 로드 완료 신호(썸네일 자동 생성에 필요)
      onReady?.();
    })().catch((e) => console.error("[LDraw] load failed:", e));

    return () => {
      cancelled = true;
      if (prev) disposeObject3D(prev);
    };
  }, [url, ldconfigUrl, loader, blueprintMode, onReady]);

  if (!group) return null;

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={group} />
    </Bounds>
  );
}

type View = "viewer" | "instruction";
type BuildMode = "step" | "part"; // ✅ 층별 / 브릭 한개씩

export default function LdrViewer({ url, partsLibraryPath, ldconfigUrl }: Props) {
  // ✅ 프레임 2종
  const [stepFrames, setStepFrames] = useState<string[]>([]);
  const [partFrames, setPartFrames] = useState<string[]>([]);
  const [buildMode, setBuildMode] = useState<BuildMode>("step");

  const [stepIndex, setStepIndex] = useState(0);

  const [view, setView] = useState<View>("viewer");
  const [blueprintMode, setBlueprintMode] = useState(true); // 설명서용 기본 ON

  // ✅ 설명서(thumb) 생성 중에는 렌더를 stepFrames로 강제 (설명서가 깨지지 않게)
  const [forceStepRender, setForceStepRender] = useState(false);

  const activeFrames = buildMode === "step" ? stepFrames : partFrames;
  const framesForRender = forceStepRender ? stepFrames : activeFrames;

  // 썸네일(각 step 캡처) 저장 (항상 STEP 기준)
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // WebGL renderer ref (캡처)
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  // step 텍스트 -> Blob URL로 loadAsync 태움
  const [stepUrl, setStepUrl] = useState<string>(url);
  const prevBlobUrlRef = useRef<string | null>(null);

  // 로드 완료를 기다리는 Promise resolver
  const readyResolverRef = useRef<(() => void) | null>(null);
  const waitForModelReady = () =>
    new Promise<void>((resolve) => {
      readyResolverRef.current = resolve;
    });

  // 1) 원본 ldr fetch -> step/part 둘 다 분해
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch(url);
      if (!res.ok)
        throw new Error(`fetch failed: ${res.status} ${res.statusText}`);

      const text = await res.text();

      const stepCumulative = splitLdrawStepsToCumulative(text);
      const partCumulative = splitLdrawPartsToCumulative(text);

      if (cancelled) return;

      setStepFrames(stepCumulative);
      setPartFrames(partCumulative);

      // ✅ thumbs는 설명서용이라 step 기준으로만
      setThumbs(new Array(stepCumulative.length).fill(""));
      setStepIndex(0);
    })().catch((e) => console.error("[LDraw] fetch failed:", e));

    return () => {
      cancelled = true;
    };
  }, [url]);

  // 2) mode 바뀌면 index가 범위를 넘지 않게 보정
  useEffect(() => {
    const max = Math.max(0, activeFrames.length - 1);
    setStepIndex((i) => Math.min(i, max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildMode, activeFrames.length]);

  // 3) stepIndex 바뀌면 Blob URL 생성 -> stepUrl 갱신 (현재 렌더 프레임 기준)
  useEffect(() => {
    if (!framesForRender.length) return;

    const max = Math.max(0, framesForRender.length - 1);
    const safeIndex = Math.min(stepIndex, max);

    const text = framesForRender[safeIndex] ?? framesForRender[0];
    const blob = new Blob([text], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
    prevBlobUrlRef.current = blobUrl;

    setStepUrl(blobUrl);
  }, [framesForRender, stepIndex]);

  // 언마운트 cleanup
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
    };
  }, []);

  const max = Math.max(0, activeFrames.length - 1);

  const downloadPng = () => {
    const gl = glRef.current;
    if (!gl) return;

    const dataUrl = gl.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ldr-${buildMode}-${stepIndex + 1}.png`;
    a.click();
  };

  const captureThumbAt = (i: number) => {
    const gl = glRef.current;
    if (!gl) return;

    const dataUrl = gl.domElement.toDataURL("image/png");
    setThumbs((prev) => {
      const next = [...prev];
      next[i] = dataUrl;
      return next;
    });
  };

  // ✅ 모든 step 썸네일 자동 생성 (설명서 페이지용) — 항상 STEP 기준
  const generateAllThumbs = async () => {
    if (!stepFrames.length) return;

    setGenerating(true);

    // ✅ 설명서 생성 중에는 렌더를 stepFrames로 강제
    setForceStepRender(true);

    // 설명서 느낌을 위해 도면모드 강제 ON
    const prevBp = blueprintMode;
    setBlueprintMode(true);

    // ✅ step 기준으로만 생성
    for (let i = 0; i < stepFrames.length; i++) {
      if (thumbs[i]) continue;

      const ready = waitForModelReady();
      setStepIndex(i);
      await ready;

      await new Promise((r) => setTimeout(r, 60));
      captureThumbAt(i);
    }

    setGenerating(false);
    setBlueprintMode(prevBp);

    // ✅ 원래 렌더 모드로 복귀
    setForceStepRender(false);
  };

  const openInstruction = async () => {
    await generateAllThumbs();
    setView("instruction");
  };

  const onModelReady = () => {
    if (readyResolverRef.current) {
      const r = readyResolverRef.current;
      readyResolverRef.current = null;
      r();
    }
  };

  // =========================
  // ✅ Instruction Sheet UI (STEP 기준)
  // =========================
  const InstructionSheet = () => {
    const coverImg = thumbs[thumbs.length - 1]; // 완성컷처럼 사용
    const left = thumbs.slice(0, Math.ceil(thumbs.length / 2));
    const right = thumbs.slice(Math.ceil(thumbs.length / 2));

    const callA = thumbs[Math.max(0, thumbs.length - 2)];
    const callB = thumbs[Math.max(0, thumbs.length - 1)];

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#d8ecff",
          padding: 18,
          overflow: "auto",
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr 260px",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* COVER */}
          <div
            style={{
              background: "#bfe2ff",
              borderRadius: 14,
              padding: 14,
              minHeight: 220,
              border: "2px solid rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>
              Brick
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>
              6+
            </div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>40375</div>

            <div
              style={{
                marginTop: 10,
                background: "rgba(255,255,255,0.85)",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: 10,
                display: "grid",
                placeItems: "center",
              }}
            >
              {coverImg ? (
                <img
                  src={coverImg}
                  alt="cover"
                  style={{ width: "100%", height: 160, objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontWeight: 900, opacity: 0.6 }}>Cover</div>
              )}
            </div>
          </div>

          {/* STEPS (2 columns like the sample page) */}
          <div
            style={{
              position: "relative",
              background: "transparent",
              padding: "0 10px",
            }}
          >
            {/* 가운데 구분선 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: 3,
                background: "#111",
                transform: "translateX(-50%)",
                opacity: 0.85,
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "34px 34px",
                alignItems: "center",
              }}
            >
              {left.map((src, idx) => {
                const stepNo = idx + 1;
                return (
                  <div
                    key={`L-${stepNo}`}
                    style={{
                      position: "relative",
                      minHeight: 210,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setBuildMode("step");
                      setStepIndex(stepNo - 1);
                      setView("viewer");
                    }}
                    role="button"
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 6,
                        top: -10,
                        fontWeight: 900,
                        fontSize: 44,
                        color: "#111",
                      }}
                    >
                      {stepNo}
                    </div>

                    {src ? (
                      <img
                        src={src}
                        alt={`step-${stepNo}`}
                        style={{
                          width: "100%",
                          maxWidth: 360,
                          height: 190,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div style={{ fontWeight: 900, opacity: 0.5 }}>
                        Step {stepNo}
                      </div>
                    )}
                  </div>
                );
              })}

              {right.map((src, idx) => {
                const stepNo = left.length + idx + 1;
                return (
                  <div
                    key={`R-${stepNo}`}
                    style={{
                      position: "relative",
                      minHeight: 210,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setBuildMode("step");
                      setStepIndex(stepNo - 1);
                      setView("viewer");
                    }}
                    role="button"
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 6,
                        top: -10,
                        fontWeight: 900,
                        fontSize: 44,
                        color: "#111",
                      }}
                    >
                      {stepNo}
                    </div>

                    {src ? (
                      <img
                        src={src}
                        alt={`step-${stepNo}`}
                        style={{
                          width: "100%",
                          maxWidth: 360,
                          height: 190,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div style={{ fontWeight: 900, opacity: 0.5 }}>
                        Step {stepNo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CALLOUT (top-right like the sample) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                background: "#fff2bf",
                borderRadius: 16,
                border: "2px solid rgba(0,0,0,0.18)",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Sub Steps</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>1</div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    padding: 8,
                  }}
                >
                  {callA ? (
                    <img
                      src={callA}
                      alt="sub-1"
                      style={{
                        width: "100%",
                        height: 90,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: 900, opacity: 0.5 }}>-</div>
                  )}
                </div>

                <div style={{ fontWeight: 900, fontSize: 18 }}>2</div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    padding: 8,
                  }}
                >
                  {callB ? (
                    <img
                      src={callB}
                      alt="sub-2"
                      style={{
                        width: "100%",
                        height: 90,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: 900, opacity: 0.5 }}>-</div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setView("viewer")}
              style={{
                height: 46,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              뷰어로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div
      style={{
        width: "100%",
        height: "70vh",
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ✅ 설명서 페이지 */}
      {view === "instruction" && <InstructionSheet />}

      {/* ✅ 하단 컨트롤 */}
      {activeFrames.length > 0 && view === "viewer" && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 20,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 14,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            backdropFilter: "blur(6px)",
          }}
        >
          {/* ✅ 층별/브릭 1개 토글 */}
          <button
            type="button"
            onClick={() => {
              setStepIndex(0);
              setBuildMode((m) => (m === "step" ? "part" : "step"));
            }}
            disabled={generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(0,0,0,0.08)",
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
            title="0 STEP 기준(층별) / 1 라인 기준(브릭 한개씩)"
          >
            {buildMode === "step" ? "브릭 한개씩" : "층별 보기"}
          </button>

          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0 || generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ◀
          </button>

          <div style={{ fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>
            {buildMode === "step" ? "Step" : "Part"} {stepIndex + 1} /{" "}
            {activeFrames.length}
            {generating ? " (설명서 생성 중...)" : ""}
          </div>

          <input
            type="range"
            min={0}
            max={max}
            value={stepIndex}
            onChange={(e) => setStepIndex(Number(e.target.value))}
            style={{ flex: 1 }}
            disabled={generating}
          />

          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.min(max, s + 1))}
            disabled={stepIndex === max || generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ▶
          </button>

          <button
            type="button"
            onClick={() => setBlueprintMode((v) => !v)}
            disabled={generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: blueprintMode ? "rgba(0,0,0,0.08)" : "#fff",
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            도면 모드
          </button>

          <button
            type="button"
            onClick={downloadPng}
            disabled={generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            PNG 저장
          </button>

          <button
            type="button"
            onClick={openInstruction}
            disabled={generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            설명서 보기
          </button>

          <button
            type="button"
            onClick={async () => {
              if (generating) return;
              try {
                // 1. 현재 URL의 파일을 Blob으로 가져오기
                const res = await fetch(url);
                if (!res.ok) throw new Error("파일 로드 실패");
                const blob = await res.blob();
                const file = new File([blob], "model.ldr", { type: "text/plain" });

                // 2. 서버로 전송
                alert("물리 테스트를 시작합니다...");
                const result = await verifyPhysicality(file);

                // 3. 결과 표시
                if (result.is_valid) {
                  alert(`✅ 테스트 통과!\n안전성 점수: ${result.score}`);
                } else {
                  const issues = result.evidence.map(e => `[${e.severity}] ${e.message}`).join("\n");
                  alert(`⚠️ 테스트 실패 (점수: ${result.score})\n\n${issues}`);
                }
              } catch (e) {
                alert(`오류 발생: ${e}`);
              }
            }}
            disabled={generating}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#ff4d4f",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            물리 테스트
          </button>
        </div>
      )}

      {/* ✅ 3D Canvas */}
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        {/* 도면 모드: 정면 고정(Orthographic) / 일반 모드: Perspective */}
        {blueprintMode ? (
          <OrthographicCamera
            makeDefault
            position={[0, 120, 300]}
            zoom={2.2}
            near={0.1}
            far={2000}
          />
        ) : (
          <PerspectiveCamera makeDefault position={[0, 150, 300]} fov={45} />
        )}

        <color attach="background" args={["#ffffff"]} />
        <ambientLight intensity={blueprintMode ? 0.95 : 0.9} />
        <directionalLight
          position={[200, 300, 200]}
          intensity={blueprintMode ? 0.8 : 1.1}
        />

        <LdrModel
          url={stepUrl}
          partsLibraryPath={partsLibraryPath}
          ldconfigUrl={ldconfigUrl}
          blueprintMode={blueprintMode}
          onReady={onModelReady}
        />

        <OrbitControls
          enableDamping
          enableRotate={!blueprintMode}
          enablePan={!blueprintMode}
          enableZoom={!blueprintMode}
        />
      </Canvas>
    </div>
  );
}
