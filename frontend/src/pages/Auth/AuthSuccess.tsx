import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./AuthSuccess.css";

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
          navigate("/auth/failure", { replace: true });
          return;
        }

        // ✅ 성공이면 마지막 페이지로 이동
        const lastPage = sessionStorage.getItem("lastPage") || "/";
        sessionStorage.removeItem("lastPage");

        // auth 관련 페이지면 홈으로 (루프 방지)
        if (lastPage.startsWith("/auth")) {
          navigate("/", { replace: true });
          return;
        }

        // 약간의 지연을 주어 애니메이션을 보여줌 (선택사항, 너무 빠르면 안보일 수 있음)
        setTimeout(() => {
          navigate(lastPage, { replace: true });
        }, 1200);

      } catch (e) {
        if (!mounted) return;
        sessionStorage.removeItem("lastPage");
        navigate("/auth/failure", { replace: true });
      }
    };

    handleSuccess();

    return () => {
      mounted = false;
    };
  }, [refresh, navigate]);

  return (
    <div className="authSuccess__container">
      <div className="authSuccess__text">login...</div>
      <div className="authSuccess__ballWrapper">
        <div className="authSuccess__ball"></div>
        <div className="authSuccess__shadow"></div>
      </div>
    </div>
  );
}
