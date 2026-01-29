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
import { registerToGallery } from "../../api/myApi";
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
        !fixed.includes("/parts/") &&
        !fixed.includes("/p/") &&
        !fixed.includes("LDConfig.ldr")
      ) {
        if (fixed.endsWith(".dat")) {
          const filename = fixed.split("/").pop() || "";

          // Primitive 패턴: n-n*.dat (예: 4-4edge, 1-4cyli, stug-*, rect*, box* 등)
          const isPrimitive = /^\d+-\d+/.test(filename) ||
            /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud)/.test(filename);

          // Subpart 패턴: 파트번호 + s + 숫자.dat (예: 3003s02.dat)
          const isSubpart = /^\d+s\d+\.dat$/.test(filename);

          if (isSubpart) {
            fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
          } else if (isPrimitive) {
            fixed = fixed.replace("/ldraw/", "/ldraw/p/");
          } else {
            // 일반 파트 (숫자로 시작하는 .dat 파일)
            fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
          }
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

  // 갤러리 등록 모달 관련
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Job 정보 (썸네일 URL)
  const [jobThumbnailUrl, setJobThumbnailUrl] = useState<string | null>(null);

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
          // 썸네일 URL 저장 (완전 원본 이미지 사용) - 항상 설정
          setJobThumbnailUrl(data.sourceImageUrl || null);
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

  const handleRegisterGallery = async () => {
    if (!galleryTitle.trim()) {
      alert(t.kids.steps.galleryModal.placeholder);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerToGallery({
        title: galleryTitle,
        content: t.kids.steps.galleryModal.content,
        tags: ["Kids", "Lego"],
        thumbnailUrl: jobThumbnailUrl || undefined,
        ldrUrl: ldrUrl || undefined,
        visibility: "PUBLIC",
      });
      alert(t.kids.steps.galleryModal.success);
      setIsGalleryModalOpen(false);
      setGalleryTitle("");
    } catch (err) {
      console.error("Gallery registration failed:", err);
      alert(t.kids.steps.galleryModal.fail);
    } finally {
      setIsSubmitting(false);
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
            className="kidsStep__actionBtn kidsStep__actionBtn--gallery"
            onClick={() => setIsGalleryModalOpen(true)}
          >
            {t.kids.steps.registerGallery}
          </button>
        </div>
      )}

      {isGalleryModalOpen && (
        <div className="galleryModalOverlay" onClick={() => setIsGalleryModalOpen(false)}>
          <div className="galleryModal" onClick={(e) => e.stopPropagation()}>
            <h3 className="galleryModal__title">
              {t.kids.steps.galleryModal.title}
            </h3>
            <input
              type="text"
              className="galleryModal__input"
              value={galleryTitle}
              onChange={(e) => setGalleryTitle(e.target.value)}
              placeholder={t.kids.steps.galleryModal.placeholder}
              autoFocus
            />
            <div className="galleryModal__actions">
              <button
                className="galleryModal__btn galleryModal__btn--cancel"
                onClick={() => setIsGalleryModalOpen(false)}
              >
                {t.kids.steps.galleryModal.cancel}
              </button>
              <button
                className="galleryModal__btn galleryModal__btn--confirm"
                onClick={handleRegisterGallery}
                disabled={isSubmitting}
              >
                {isSubmitting ? "..." : t.kids.steps.galleryModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
