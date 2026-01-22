import "./KidsPage.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import Background3D from "../MainPage/components/Background3D";
import KidsGlbViewer from "./components/KidsGlbViewer";
import KidsLdrPreview from "./components/KidsLdrPreview";

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
  prompt: string; // 백엔드가 다시 만들어서 내려줄 수도 있음
  taskId: string;
  modelUrl: string; // 대표 모델 url (상대/절대 가능)
  files: Record<string, string>; // { glb: "/generated/..glb", ... }
};

type BrickifyResp = {
  ldrUrl: string; // "/generated/...ldr"
  files?: Record<string, string>;
};

const API_BASE = "/api/v1/kids"; // ✅ FastAPI prefix(/v1/kids)에 맞춤
const API_ASSET_PREFIX = "/api"; // ✅ 백엔드가 "/generated/..." 같은 상대경로 주면 프록시를 타도록

function urlNoCache(u: string) {
  return u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
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
  // 백엔드가 "/generated/..."를 반환하면 프록시 경유해서 "/api/generated/..."로 요청
  if (u.startsWith("/")) return `${API_ASSET_PREFIX}${u}`;
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
  const referenceLdr = params.get("model");

  // navigate state에서 파일 받기
  const rawFile =
    (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 단계별 산출물
  const [correctedFile, setCorrectedFile] = useState<File | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>("");

  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [files3d, setFiles3d] = useState<Record<string, string> | null>(null);

  const [ldrUrl, setLdrUrl] = useState<string | null>(null);

  // 보기 탭
  const [tab, setTab] = useState<"corrected" | "prompt" | "glb" | "ldr">("glb");

  const hasImage = !!rawFile;

  // 자동 실행 중복 방지(React StrictMode/dev에서 useEffect 2번 실행 방지)
  const autoRunOnceRef = useRef(false);

  // cleanup: ObjectURL
  useEffect(() => {
    return () => {
      if (correctedUrl?.startsWith("blob:")) URL.revokeObjectURL(correctedUrl);
    };
  }, [correctedUrl]);

  // -----------------------------
  // Step 1) 나노바나나 보정(/render-image)
  // -----------------------------
  const runCorrect = async () => {
    if (!rawFile) return;

    setStep("correcting");
    setErrorMsg(null);

    // 이전 결과 초기화
    setCorrectedFile(null);
    if (correctedUrl?.startsWith("blob:")) URL.revokeObjectURL(correctedUrl);
    setCorrectedUrl(null);

    setPrompt("");
    setGlbUrl(null);
    setFiles3d(null);
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

    // render-image는 이미지 bytes를 Response로 반환하므로 blob->File로 래핑
    const file = await fetchBlobAsFile(res, "corrected.png");
    const objUrl = URL.createObjectURL(file);

    setCorrectedFile(file);
    setCorrectedUrl(objUrl);
    setTab("corrected");
  };

  // -----------------------------
  // Step 2) 프롬프트 생성(/generate-prompt)
  // -----------------------------
  const runPrompt = async () => {
    if (!correctedFile) throw new Error("보정 이미지가 없습니다");

    setStep("prompting");
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", correctedFile);

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
    setTab("prompt");
  };

  // -----------------------------
  // Step 3) 3D 생성(/generate-3d)
  // - 백엔드에 prompt Form 필드 지원이 있으면 같이 넘김(추천)
  // - 백엔드가 prompt를 안 받더라도(현재 코드) 무시될 수 있음
  // -----------------------------
  const run3D = async () => {
    if (!correctedFile) throw new Error("보정 이미지가 없습니다");
    if (!prompt) throw new Error("프롬프트가 없습니다");

    setStep("modeling");
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", correctedFile);
    if (referenceLdr) form.append("referenceLdr", referenceLdr);

    // ✅ 백엔드가 prompt 받도록 해두면 진짜 순차 파이프라인 됨
    form.append("prompt", prompt);

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

    setFiles3d(data.files ?? null);

    const candidate =
      data.files?.glb ?? data.modelUrl ?? (data.files ? Object.values(data.files)[0] : null);

    const finalGlb = toApiUrl(candidate);
    if (!finalGlb) throw new Error("GLB URL을 받지 못했습니다");

    setGlbUrl(finalGlb);
    setTab("glb");
  };

  // -----------------------------
  // Step 4) 브릭화(/brickify)
  // - 네 백엔드에 아직 없으면 404가 정상임 (추가 구현 필요)
  // -----------------------------
  const runBrickify = async () => {
    if (!glbUrl) throw new Error("GLB URL이 없습니다");

    setStep("brickifying");
    setErrorMsg(null);

    const form = new FormData();
    form.append("glbUrl", glbUrl);

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
    setTab("ldr");
  };

  // -----------------------------
  // 전체 자동 실행
  // -----------------------------
  useEffect(() => {
    if (!rawFile) return;
    if (autoRunOnceRef.current) return; // ✅ StrictMode 중복 실행 방지
    autoRunOnceRef.current = true;

    (async () => {
      try {
        await runCorrect();
        await runPrompt();
        await run3D();
        await runBrickify();
        setStep("done");
      } catch (e: any) {
        setStep("error");
        setErrorMsg(e?.message ?? "실패");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFile, referenceLdr]);

  // -----------------------------
  // Render helpers
  // -----------------------------
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

  const label = useMemo(() => {
    switch (step) {
      case "correcting":
        return "사진 보정 중...";
      case "prompting":
        return "프롬프트 생성 중...";
      case "modeling":
        return "3D 모델 생성 중...";
      case "brickifying":
        return "브릭화 중...";
      case "done":
        return "완료!";
      case "error":
        return "오류 발생";
      default:
        return "";
    }
  }, [step]);

  return (
    <div className="kidsPage">
      <Background3D entryDirection="float" />

      <div className="kidsPage__center">
        <div className="kidsPage__title">레고 만들기</div>
        <div className="kidsPage__sub">
          {hasImage ? "단계별 생성 파이프라인" : referenceLdr ? "3D 미리보기" : "대기"}
        </div>

        {hasImage && (
          <div className="kidsPage__progressWrap">
            <div className="kidsPage__progressBar">
              <div
                className="kidsPage__progressFill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="kidsPage__progressText">{label}</div>
          </div>
        )}

        {errorMsg && <div className="kidsPage__error">{errorMsg}</div>}

        {/* 탭 */}
        {hasImage && (
          <div className="kidsPage__tabs">
            <button
              className={`kidsPage__tab ${tab === "corrected" ? "isActive" : ""
                }`}
              onClick={() => setTab("corrected")}
              disabled={!correctedUrl}
            >
              보정 이미지
            </button>
            <button
              className={`kidsPage__tab ${tab === "prompt" ? "isActive" : ""}`}
              onClick={() => setTab("prompt")}
              disabled={!prompt}
            >
              프롬프트
            </button>
            <button
              className={`kidsPage__tab ${tab === "glb" ? "isActive" : ""}`}
              onClick={() => setTab("glb")}
              disabled={!glbUrl}
            >
              3D(GLB)
            </button>
            <button
              className={`kidsPage__tab ${tab === "ldr" ? "isActive" : ""}`}
              onClick={() => setTab("ldr")}
              disabled={!ldrUrl}
            >
              LDR
            </button>
          </div>
        )}

        <div className="kidsPage__singleView">
          {/* 이미지가 없고 모델만 있으면 미리보기 */}
          {!hasImage && referenceLdr && (
            <div className="kidsPage__3dViewer">
              <KidsLdrPreview url={referenceLdr} />
            </div>
          )}

          {!hasImage && !referenceLdr && (
            <div className="kidsPage__empty">
              <div>표시할 콘텐츠가 없습니다</div>
            </div>
          )}

          {hasImage && (
            <>
              {tab === "corrected" && correctedUrl && (
                <img
                  src={correctedUrl}
                  alt="corrected"
                  className="kidsPage__resultImg"
                  onError={() => setErrorMsg("보정 이미지 로드 실패")}
                />
              )}

              {tab === "prompt" && (
                <div className="kidsPage__promptBox">
                  <textarea readOnly value={prompt} />
                  <div className="kidsPage__actions">
                    <button
                      onClick={() => navigator.clipboard.writeText(prompt)}
                      disabled={!prompt}
                    >
                      복사
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await run3D();
                          await runBrickify();
                          setStep("done");
                        } catch (e: any) {
                          setStep("error");
                          setErrorMsg(e?.message ?? "실패");
                        }
                      }}
                      disabled={
                        !prompt ||
                        !correctedFile ||
                        step === "modeling" ||
                        step === "brickifying"
                      }
                    >
                      이 프롬프트로 다시 생성
                    </button>
                  </div>
                </div>
              )}

              {tab === "glb" && glbUrl && (
                <div
                  className="kidsPage__3dViewer"
                  style={{ border: "2px solid #3b82f6" }}
                >
                  <KidsGlbViewer url={glbUrl} />
                </div>
              )}

              {tab === "ldr" && ldrUrl && (
                <div className="kidsPage__3dViewer">
                  <KidsLdrPreview url={ldrUrl} />
                </div>
              )}

              {/* 단계별 재시도 */}
              <div className="kidsPage__retryRow">
                <button
                  onClick={async () => {
                    try {
                      await runCorrect();
                      await runPrompt();
                      await run3D();
                      await runBrickify();
                      setStep("done");
                    } catch (e: any) {
                      setStep("error");
                      setErrorMsg(e?.message ?? "실패");
                    }
                  }}
                  disabled={step === "correcting"}
                >
                  처음부터 다시
                </button>

                <button
                  onClick={async () => {
                    try {
                      await runPrompt();
                      await run3D();
                      await runBrickify();
                      setStep("done");
                    } catch (e: any) {
                      setStep("error");
                      setErrorMsg(e?.message ?? "실패");
                    }
                  }}
                  disabled={!correctedFile || step === "prompting"}
                >
                  프롬프트부터
                </button>

                <button
                  onClick={async () => {
                    try {
                      await run3D();
                      await runBrickify();
                      setStep("done");
                    } catch (e: any) {
                      setStep("error");
                      setErrorMsg(e?.message ?? "실패");
                    }
                  }}
                  disabled={!prompt || step === "modeling"}
                >
                  3D부터
                </button>

                <button
                  onClick={async () => {
                    try {
                      await runBrickify();
                      setStep("done");
                    } catch (e: any) {
                      setStep("error");
                      setErrorMsg(e?.message ?? "실패");
                    }
                  }}
                  disabled={!glbUrl || step === "brickifying"}
                >
                  브릭화만
                </button>
              </div>

              {/* 디버그: 3D 파일들 */}
              {files3d && (
                <div className="kidsPage__debug">
                  <div className="kidsPage__debugTitle">3D files</div>
                  <pre>{JSON.stringify(files3d, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}