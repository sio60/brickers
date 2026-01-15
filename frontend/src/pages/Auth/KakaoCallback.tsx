import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function KakaoCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("Kakao OAuth error:", error, params.get("error_description"));
      navigate("/", { replace: true });
      return;
    }

    if (!code) {
      console.error("No code in callback");
      navigate("/", { replace: true });
      return;
    }

    console.log("Kakao code:", code);

    // ✅ 프론트만: code 확인까지만
    navigate("/", { replace: true });
  }, [navigate]);

  return <div style={{ padding: 24 }}>카카오 로그인 처리중...</div>;
}
