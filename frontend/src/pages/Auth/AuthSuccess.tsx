// src/pages/Auth/AuthSuccess.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // ✅ 너희 실제 경로로 맞춰줘 (예시)

export default function AuthSuccess() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const handleSuccess = async () => {
      try {
        // ✅ refresh-cookie 기반으로 accessToken 재발급 + me 세팅
        const token = await refresh();

        if (!mounted) return;

        // ✅ refresh 실패면 로그인 실패 페이지/홈으로
        if (!token) {
          sessionStorage.removeItem("lastPage");
          navigate("/auth/failure", { replace: true }); // 또는 "/"
          return;
        }

        // ✅ 성공이면 마지막 페이지로 이동
        const lastPage = sessionStorage.getItem("lastPage") || "/";
        sessionStorage.removeItem("lastPage"); // ✅ 한번 쓰고 제거(꼬임 방지)

        // lastPage가 auth 관련 페이지면 홈으로 보내기 (루프 방지)
        if (lastPage.startsWith("/auth")) {
          navigate("/", { replace: true });
          return;
        }

        navigate(lastPage, { replace: true });
      } catch (e) {
        if (!mounted) return;
        sessionStorage.removeItem("lastPage");
        navigate("/auth/failure", { replace: true }); // 또는 "/"
      }
    };

    handleSuccess();

    return () => {
      mounted = false;
    };
  }, [refresh, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>로그인 처리 중... 잠시만 기다려주세요</h2>
    </div>
  );
}
