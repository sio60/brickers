import "./KidsPage.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";
type Step =
  | "idle"
  | "correcting"
  | "prompting"
  | "modeling"
  | "brickifying"
  | "done"
  | "error";

type PromptResp = { prompt: string };

type Generate3DResp = {
  prompt: string;
  taskId: string;
  modelUrl: string;
  files: Record<string, string>;
};

type BrickifyResp = {
  ldrUrl: string; // "/api/generated/...ldr"
  parts: number;
  finalTarget: number;
};

const API_BASE = "/api/v1/kids"; // FastAPI prefix

// ── 무한 재시도 설정 ──
const RETRY_DELAY_MS = 3000;

async function withInfiniteRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number) => void
): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (e) {
      onRetry?.(attempt);
      // 지수 백오프: 최대 30초까지
      const delay = Math.min(RETRY_DELAY_MS * Math.pow(1.5, attempt - 1), 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function toApiUrl(u: string | null) {
  if (!u) return null;
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("blob:") ||
    u.startsWith("data:")
  ) {
    return u;
  }

  // ✅ 이미 /api/ 로 시작하면 그대로 (중복 prefix 방지)
  if (u.startsWith("/api/")) return u;

  // ✅ 예전 호환: /generated/... 만 오면 /api 붙여서 프록시 경유
  if (u.startsWith("/generated/")) return `/api${u}`;

  // 그 외는 그대로
  if (u.startsWith("/")) return u;
  return u;
}

async function fetchBlobAsFile(res: Response, filename: string): Promise<File> {
  const blob = await res.blob();
  return new File([blob], filename, {
    type: blob.type || "application/octet-stream",
  });
}

export default function KidsPage() {
  const [params] = useSearchParams();
  const location = useLocation();

  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";
  const referenceLdr = params.get("model");

  // ✅ 레벨별 예산 고정
  const budget = useMemo(() => {
    if (age === "4-5") return 50;
    if (age === "6-7") return 100;
    return 150;
  }, [age]);

  // navigate state에서 파일 받기
  const rawFile =
    (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  const [step, setStep] = useState<Step>("idle");

  const [, setCorrectedFile] = useState<File | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);

  const [, setPrompt] = useState<string>("");

  const [, setGlbUrl] = useState<string | null>(null);

  const [ldrUrl, setLdrUrl] = useState<string | null>(null);

  const hasImage = !!rawFile;
  const autoRunOnceRef = useRef(false);

  useEffect(() => {
    return () => {
      if (correctedUrl?.startsWith("blob:")) URL.revokeObjectURL(correctedUrl);
    };
  }, [correctedUrl]);

  // -----------------------------
  // Step 1) 나노바나나 보정
  // -----------------------------
  const runCorrect = async (): Promise<File> => {
    if (!rawFile) throw new Error("원본 이미지가 없습니다");

    setStep("correcting");

    setCorrectedFile(null);
    if (correctedUrl?.startsWith("blob:")) URL.revokeObjectURL(correctedUrl);
    setCorrectedUrl(null);

    setPrompt("");
    setGlbUrl(null);
    setLdrUrl(null);

    const form = new FormData();
    form.append("file", rawFile);

    const res = await fetch(`${API_BASE}/render-image`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`render-image 실패 (${res.status}) ${t}`);
    }

    const file = await fetchBlobAsFile(res, "corrected.png");
    const objUrl = URL.createObjectURL(file);

    setCorrectedFile(file);
    setCorrectedUrl(objUrl);
    return file;  // ✅ 결과 반환
  };

  // -----------------------------
  // Step 2) 프롬프트 생성
  // -----------------------------
  const runPrompt = async (imgFile: File): Promise<string> => {
    setStep("prompting");

    const form = new FormData();
    form.append("file", imgFile);

    const res = await fetch(`${API_BASE}/generate-prompt`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`generate-prompt 실패 (${res.status}) ${t}`);
    }

    const data = (await res.json()) as PromptResp;
    const p = (data.prompt ?? "").trim();
    if (!p) throw new Error("프롬프트가 비어있습니다");

    setPrompt(p);
    return p;  // ✅ 결과 반환
  };

  // -----------------------------
  // Step 3) 3D 생성
  // -----------------------------
  const run3D = async (imgFile: File, promptText: string): Promise<string> => {
    setStep("modeling");

    const form = new FormData();
    form.append("file", imgFile);
    if (referenceLdr) form.append("referenceLdr", referenceLdr);
    form.append("prompt", promptText);

    const res = await fetch(`${API_BASE}/generate-3d`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`generate-3d 실패 (${res.status}) ${t}`);
    }

    const data = (await res.json()) as Generate3DResp;

    const candidate =
      data.files?.glb ?? data.modelUrl ?? (data.files ? Object.values(data.files)[0] : null);

    const finalGlb = toApiUrl(candidate);
    if (!finalGlb) throw new Error("GLB URL을 받지 못했습니다");

    setGlbUrl(finalGlb);
    return finalGlb;  // ✅ 결과 반환
  };

  // -----------------------------
  // Step 4) 브릭화
  // -----------------------------
  const runBrickify = async (glbUrlParam: string): Promise<string> => {
    setStep("brickifying");

    const form = new FormData();
    form.append("glbUrl", glbUrlParam);
    form.append("age", age);
    form.append("budget", String(budget));

    const res = await fetch(`${API_BASE}/brickify`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`brickify 실패 (${res.status}) ${t}`);
    }

    const data = (await res.json()) as BrickifyResp;
    const ldr = toApiUrl(data.ldrUrl);
    if (!ldr) throw new Error("LDR URL을 받지 못했습니다");

    setLdrUrl(ldr);
    return ldr;  // ✅ 결과 반환
  };

  // -----------------------------
  // 전체 자동 실행
  // -----------------------------
  useEffect(() => {
    if (!rawFile) return;
    if (autoRunOnceRef.current) return;
    autoRunOnceRef.current = true;

    (async () => {
      // ✅ 각 단계의 결과를 명시적으로 다음 단계에 전달
      const imgFile = await withInfiniteRetry(() => runCorrect());
      const promptText = await withInfiniteRetry(() => runPrompt(imgFile));
      const glb = await withInfiniteRetry(() => run3D(imgFile, promptText));
      await withInfiniteRetry(() => runBrickify(glb));
      setStep("done");
    })();
    // eslint-disable-next-line react-hooks-deps
  }, [rawFile, referenceLdr, age]);

  const percent = useMemo(() => {
    switch (step) {
      case "correcting":
        return 25;
      case "prompting":
        return 50;
      case "modeling":
        return 75;
      case "brickifying":
        return 90;
      case "done":
        return 100;
      default:
        return 0;
    }
  }, [step]);

  return (
    <div className="kidsPage">
      <Background3D entryDirection="float" />

      <div className="kidsPage__center">
        {/* ✅ 로딩 중일 때만 타이틀 표시 */}
        {hasImage && step !== "done" && (
          <div className="kidsPage__title">Creating Your BRICK</div>
        )}

        {/* ✅ 업로드 파일 있으면: done 전까지 로딩(+미니게임) - 무한 재시도 */}
        {hasImage && step !== "done" && (
          <KidsLoadingScreen percent={percent} />
        )}

        {/* ✅ 완료되면 결과 카드 */}
        {hasImage && step === "done" && ldrUrl && (
          <>
            <div className="kidsPage__resultTitle">Your Brick is Ready!</div>
            <div className="kidsPage__resultCard">

              <div className="kidsPage__3dViewer">
                <KidsLdrPreview url={ldrUrl} />
              </div>
            </div>
          </>
        )}

        {/* ✅ 이미지 없이 referenceLdr로 들어온 경우도 결과만 */}
        {!hasImage && referenceLdr && (
          <>
            <div className="kidsPage__resultTitle">Brick Preview</div>
            <div className="kidsPage__resultCard">
              <div className="kidsPage__3dViewer">
                <KidsLdrPreview url={referenceLdr} />
              </div>
            </div>
          </>
        )}

        {!hasImage && !referenceLdr && (
          <div className="kidsPage__empty">No content to display</div>
        )}
      </div>
    </div>
  );
}