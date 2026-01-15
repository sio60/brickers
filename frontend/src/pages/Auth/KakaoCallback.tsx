import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function KakaoCallback() {
  console.log("### KakaoCallback MOUNT", window.location.href);
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    // ✅ React 18 StrictMode에서 useEffect 2번 실행 방지
    console.log("### before navigate");
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("Kakao callback url:", window.location.href);
    console.log("Kakao code:", code);

    if (!code) {
      // ❌ 여기서 navigate 하지 마. 그냥 멈춰.
      console.warn("No code in callback (stop)");
      return;
    }

    // ✅ 여기서부터는 code가 확실히 있을 때만 실행
    // 1) 백엔드에 code 전달해서 로그인 처리 (JWT 발급/쿠키 세팅 등)
    fetch(`http://localhost:8080/auth/kakao/callback?code=${encodeURIComponent(code)}`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json().catch(() => ({}));
      })
      .then(() => {
        // 2) 성공하면 메인으로
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error("Kakao login failed:", err);
        // 실패 시에도 즉시 메인으로 보내기보단 안내 페이지/모달 추천
        navigate("/", { replace: true });
      });
  }, [navigate]);

  return <div>카카오 로그인 처리중...</div>;
}
