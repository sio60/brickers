import "./KidsPage.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Background3D from "../MainPage/components/Background3D";
import KidsLdrPreview from "./components/KidsLdrPreview";
import KidsLoadingScreen from "./components/KidsLoadingScreen";

// 응답 타입: ldrUrl 대신 ldrData(문자열)를 받습니다.
type GenerateResp = {
  ok: boolean;
  reqId: string;
  prompt: string;
  ldrData: string; 
  parts: number;
  finalTarget: number;
};

export default function KidsPage() {
  const [params] = useSearchParams();
  const location = useLocation();

  const age = (params.get("age") ?? "4-5") as "4-5" | "6-7" | "8-10";
  
  const budget = useMemo(() => {
    if (age === "4-5") return 50;
    if (age === "6-7") return 100;
    return 150;
  }, [age]);

  const rawFile = (location.state as { uploadedFile?: File } | null)?.uploadedFile ?? null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [ldrUrl, setLdrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rawFile || status !== "idle") return;

    const runProcess = async () => {
      setStatus("loading");
      try {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("age", age);
        formData.append("budget", String(budget));

        // Spring Boot로 요청
        const res = await fetch("/api/kids/generate", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Server Error: ${errText}`);
        }

        const data: GenerateResp = await res.json();
        
        // ✅ [핵심 로직] Base64 문자열 -> Blob -> URL 변환
        if (data.ldrData) {
            try {
                // "data:text/plain;base64," 뒷부분만 잘라내기
                const base64Content = data.ldrData.split(',')[1];
                
                // 디코딩 (브라우저 내장 함수 atob 사용)
                const binaryString = window.atob(base64Content);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // 가상의 파일 객체(Blob) 생성
                const blob = new Blob([bytes], { type: 'text/plain' });
                // 가짜 URL 생성 (예: blob:http://localhost:5173/xxxx-xxxx...)
                const tempUrl = URL.createObjectURL(blob);
                
                setLdrUrl(tempUrl);
                setStatus("done");
            } catch (err) {
                console.error("Base64 converting error:", err);
                throw new Error("File conversion failed");
            }
        } else {
            throw new Error("No LDR data received");
        }

      } catch (e) {
        console.error("Brick generation failed:", e);
        setStatus("error");
      }
    };

    runProcess();
    
    // Cleanup: 컴포넌트가 꺼질 때 메모리 해제
    return () => {
        if (ldrUrl) URL.revokeObjectURL(ldrUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFile, age, budget]); 

  // 로딩바용 퍼센트 (가짜)
  const percent = status === "done" ? 100 : status === "loading" ? 60 : 0;

  return (
    <div className="kidsPage">
      <Background3D entryDirection="float" />

      <div className="kidsPage__center">
        {status === "loading" && (
          <>
            <div className="kidsPage__title">AI is making your brick...</div>
            <KidsLoadingScreen percent={percent} />
          </>
        )}

        {status === "done" && ldrUrl && (
          <>
            <div className="kidsPage__resultTitle">Your Brick is Ready!</div>
            <div className="kidsPage__resultCard">
              <div className="kidsPage__3dViewer">
                <KidsLdrPreview url={ldrUrl} />
              </div>
            </div>
          </>
        )}

        {status === "error" && (
          <div className="kidsPage__error">
            Oops! Something went wrong.<br/>
            Please try again later.
          </div>
        )}
      </div>
    </div>
  );
}