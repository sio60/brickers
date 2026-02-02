// KidsStepPage.tsx
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

import { getColorThemes, applyColorVariant, base64ToBlobUrl, downloadLdrFromBase64, type ThemeInfo } from "../../api/colorVariantApi";
import "./KidsStepPage.css";
import SEO from "../../components/SEO";

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
  url: string;
  overrideMainLdrUrl?: string;
  partsLibraryPath?: string;
  ldconfigUrl?: string;
  onLoaded?: (group: THREE.Group) => void;
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
        } catch { }
      }

      const isAbsolute =
        fixed.startsWith("http://") ||
        fixed.startsWith("https://") ||
        fixed.startsWith("blob:") ||
        fixed.startsWith("/") ||
        fixed.includes(":");

      // blob 상태에서 submodel 상대경로 깨짐 방지
      if (overrideMainLdrUrl && !isAbsolute) {
        try {
          fixed = new URL(fixed, url).href;
        } catch { }
      }

      // CDN parts/p 보정
      if (
        fixed.includes("ldraw-parts-library") &&
        fixed.endsWith(".dat") &&
        !fixed.includes("LDConfig.ldr")
      ) {
        const filename = fixed.split("/").pop() || "";

        // Primitive 패턴: n-n*.dat (예: 4-4edge, 1-4cyli, stug-*, rect*, box* 등)
        const isPrimitive = /^\d+-\d+/.test(filename) ||
          /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);

        // Subpart 패턴: 파트번호 + s + 숫자.dat (예: 3003s02.dat)
        const isSubpart = /^\d+s\d+\.dat$/.test(filename);

        // 잘못된 경로 조합 수정
        fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");  // /models/p/ → /p/
        fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");  // /models/parts/ → /parts/
        fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
        fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
        fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");

        // primitive가 /parts/에 잘못 들어간 경우 수정
        if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
          fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
        }

        // subpart가 /p/에 잘못 들어간 경우 수정
        if (isSubpart && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
          fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
        }

        // 이미 올바른 경로가 있으면 그대로 사용
        if (fixed.includes("/parts/") || fixed.includes("/p/")) {
          return fixed;
        }

        // 경로가 없는 경우 적절한 경로 추가
        if (isSubpart) {
          fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
        } else if (isPrimitive) {
          fixed = fixed.replace("/ldraw/", "/ldraw/p/");
        } else {
          fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
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

      g.rotation.x = Math.PI;

      prev = g;
      setGroup(g);
      onLoaded?.(g);
    })().catch((e: any) => {
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
  const { t } = useLanguage();

  const [params] = useSearchParams();

  const jobId = params.get("jobId") || "";
  const urlParam = params.get("url") || "";

  const [ldrUrl, setLdrUrl] = useState<string>(urlParam);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepBlobUrls, setStepBlobUrls] = useState<string[]>([]);
  const blobRef = useRef<string[]>([]);
  const modelGroupRef = useRef<THREE.Group | null>(null);





  // 색상 변경 관련
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [colorThemes, setColorThemes] = useState<ThemeInfo[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [isApplyingColor, setIsApplyingColor] = useState(false);
  const [colorChangedLdrUrl, setColorChangedLdrUrl] = useState<string | null>(null);
  const [colorChangedLdrBase64, setColorChangedLdrBase64] = useState<string | null>(null);

  const revokeAll = (arr: string[]) => {
    arr.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch { }
    });
  };

  // ✅ 1) jobId로 백엔드에서 Job 정보 가져오기 (ldrUrl, thumbnailUrl)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!jobId) return;

      try {
        const res = await fetch(`/api/kids/jobs/${jobId}`);
        if (!res.ok) throw new Error(`job fetch failed: ${res.status}`);
        const data = await res.json();

        if (alive) {
          // ldrUrl이 없으면 Job에서 가져오기
          if (!ldrUrl) {
            const u = data.ldrUrl || data.ldr_url || "";
            setLdrUrl(u);
          }
        }
      } catch (e) {
        console.error("[KidsStepPage] failed to resolve job info by jobId:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [jobId]); // ldrUrl 의존성 제거 - jobId 있으면 항상 fetch해서 thumbnailUrl 가져옴

  // ✅ 2) ldrUrl로 step blob 생성
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ldrUrl) return;

      console.log("[KidsStepPage] Loading LDR from:", ldrUrl);
      setLoading(true);
      setStepIdx(0);

      const res = await fetch(ldrUrl);
      if (!res.ok) throw new Error(`LDR fetch failed: ${res.status} ${res.statusText}`);

      const text = await res.text();
      console.log("[KidsStepPage] LDR content length:", text.length);

      const stepTexts = buildCumulativeStepTexts(text);
      console.log("[KidsStepPage] Generated steps:", stepTexts.length);

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
      // 로딩 off는 onLoaded에서
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
  }, [ldrUrl]);

  useEffect(() => {
    return () => revokeAll(blobRef.current);
  }, []);

  // 색상 테마 목록 로드
  useEffect(() => {
    if (isColorModalOpen && colorThemes.length === 0) {
      getColorThemes()
        .then(setColorThemes)
        .catch((e: any) => console.error("테마 로드 실패:", e));
    }
  }, [isColorModalOpen]);

  // 색상 변경 적용
  const handleApplyColor = async () => {
    if (!selectedTheme || !ldrUrl) return;

    setIsApplyingColor(true);
    try {
      const result = await applyColorVariant(ldrUrl, selectedTheme);

      if (result.ok && result.ldrData) {
        // 이전 blob URL 정리
        if (colorChangedLdrUrl) {
          URL.revokeObjectURL(colorChangedLdrUrl);
        }

        // 새 blob URL 생성 및 저장
        const newBlobUrl = base64ToBlobUrl(result.ldrData);
        setColorChangedLdrUrl(newBlobUrl);
        setColorChangedLdrBase64(result.ldrData);

        // step blob들 재생성
        const text = atob(result.ldrData);
        const stepTexts = buildCumulativeStepTexts(text);
        const blobs = stepTexts.map((t) =>
          URL.createObjectURL(new Blob([t], { type: "text/plain" }))
        );

        revokeAll(blobRef.current);
        blobRef.current = blobs;
        setStepBlobUrls(blobs);
        setStepIdx(stepTexts.length - 1); // 마지막 단계로 이동

        setIsColorModalOpen(false);
        alert(`${result.themeApplied} 테마 적용 완료! (${result.changedBricks}개 브릭 변경)`);
      } else {
        alert(result.message || "색상 변경 실패");
      }
    } catch (e: any) {
      console.error("색상 변경 실패:", e);
      alert(e.message || "색상 변경 중 오류가 발생했습니다.");
    } finally {
      setIsApplyingColor(false);
    }
  };

  // 색상 변경된 LDR 다운로드
  const downloadColorChangedLdr = () => {
    if (colorChangedLdrBase64) {
      downloadLdrFromBase64(colorChangedLdrBase64, `brickers_${selectedTheme}.ldr`);
    }
  };

  const downloadLdr = async () => {
    if (!ldrUrl) return;
    try {
      const res = await fetch(ldrUrl);
      if (!res.ok) throw new Error("LDR download fetch failed");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "brickers_model.ldr";
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("LDR download failed:", err);
    }
  };

  const downloadGlb = async () => {
    if (!jobId) {
      if (!modelGroupRef.current) return;
      const exporter = new GLTFExporter();
      exporter.parse(
        modelGroupRef.current,
        (result) => {
          const output = result instanceof ArrayBuffer ? result : JSON.stringify(result);
          const blob = new Blob([output], {
            type: result instanceof ArrayBuffer
              ? "application/octet-stream"
              : "application/json",
          });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = "brickers_model.glb";
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        },
        (error) => console.error("GLB export failed:", error),
        { binary: true }
      );
      return;
    }

    try {
      const res = await fetch(`/api/kids/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job info");
      const data = await res.json();

      const glbUrl = data.glbUrl || data.glb_url;
      if (!glbUrl) {
        alert(t.kids.steps.glbNotFound);
        return;
      }

      const link = document.createElement("a");
      link.href = glbUrl;
      link.download = `brickers_${jobId}.glb`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to download server GLB:", e);
      alert(t.kids.steps.glbDownloadFail);
    }
  };



  if (!ldrUrl) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => nav(-1)}>← {t.kids.steps.back}</button>
        <div style={{ marginTop: 12 }}>{t.kids.steps.noUrl}</div>
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
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <SEO
        title="Building Instructions"
        description="Follow step-by-step instructions to build your LEGO model."
        keywords="lego, building, instructions, step by step, 3d view"
      />
      {/* 상단바 */}
      <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)" }}>
        <button onClick={() => nav(-1)} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 800, cursor: "pointer" }}>
          ← {t.kids.steps.back}
        </button>

        <div style={{ fontWeight: 900, letterSpacing: 0.5, opacity: 0.9 }}>
          BRICKERS
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 900 }}>
          {t.kids.steps.title.replace("{cur}", String(stepIdx + 1)).replace("{total}", String(total))}
        </div>
      </div>

      {/* 중앙 카드 */}
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "28px 20px 36px" }}>
        <div style={{ width: "min(1100px, 92vw)", aspectRatio: "16 / 9", borderRadius: 18, background: "rgba(255,255,255,0.92)", border: "2px solid rgba(0,0,0,0.55)", boxShadow: "0 18px 40px rgba(0,0,0,0.14)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.9)", fontWeight: 900 }}>
            {t.kids.steps.preview}
          </div>

          {loading && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(4px)", fontWeight: 900, color: "#666" }}>
              {t.kids.steps.loading}
            </div>
          )}

          <div style={{ position: "absolute", inset: 0 }}>
            <Canvas camera={{ position: [220, 0, 220], fov: 45 }} dpr={[1, 2]}>
              <ambientLight intensity={0.9} />
              <directionalLight position={[3, 5, 2]} intensity={1.0} />

              <LdrModel
                url={ldrUrl}
                overrideMainLdrUrl={overrideMainLdrUrl}
                onLoaded={(g) => {
                  setLoading(false);
                  modelGroupRef.current = g;
                }}
                onError={() => setLoading(false)}
              />

              <OrbitControls makeDefault enablePan={false} enableZoom />
            </Canvas>
          </div>

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
            ← {t.kids.steps.prev}
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
            {t.kids.steps.next} →
          </button>
        </div>
      </div>

      {params.get("isPreset") !== "true" && (
        <div className="kidsStep__actionContainer">
          <button className="kidsStep__actionBtn" onClick={downloadGlb}>
            {t.kids.steps.downloadGlb}
          </button>

          <button className="kidsStep__actionBtn" onClick={downloadLdr}>
            {t.kids.steps.downloadLdr}
          </button>



          <button
            className="kidsStep__actionBtn kidsStep__actionBtn--color"
            onClick={() => setIsColorModalOpen(true)}
          >
            🎨 색상 변경
          </button>

          {colorChangedLdrBase64 && (
            <button
              className="kidsStep__actionBtn kidsStep__actionBtn--download"
              onClick={downloadColorChangedLdr}
            >
              📥 변경된 LDR 다운로드
            </button>
          )}
        </div>
      )}



      {/* 색상 변경 모달 */}
      {isColorModalOpen && (
        <div className="galleryModalOverlay" onClick={() => setIsColorModalOpen(false)}>
          <div className="galleryModal colorModal" onClick={(e) => e.stopPropagation()}>
            <h3 className="galleryModal__title">
              🎨 색상 테마 선택
            </h3>

            <div className="colorModal__themes">
              {colorThemes.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                  테마 로딩 중...
                </div>
              ) : (
                colorThemes.map((theme) => (
                  <button
                    key={theme.name}
                    className={`colorModal__themeBtn ${selectedTheme === theme.name ? "colorModal__themeBtn--selected" : ""}`}
                    onClick={() => setSelectedTheme(theme.name)}
                  >
                    <span className="colorModal__themeName">{theme.name}</span>
                    <span className="colorModal__themeDesc">{theme.description}</span>
                  </button>
                ))
              )}
            </div>

            <div className="galleryModal__actions">
              <button
                className="galleryModal__btn galleryModal__btn--cancel"
                onClick={() => setIsColorModalOpen(false)}
              >
                취소
              </button>
              <button
                className="galleryModal__btn galleryModal__btn--confirm"
                onClick={handleApplyColor}
                disabled={!selectedTheme || isApplyingColor}
              >
                {isApplyingColor ? "적용 중..." : "적용하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
