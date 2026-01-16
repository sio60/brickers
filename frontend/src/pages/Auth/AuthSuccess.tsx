import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    (async () => {
      // ✅ 백엔드 세션 쿠키 기반으로 실제 로그인 확인 + 유저 저장
      await refresh();

      // ✅ 로그인 누른 그 페이지로 복귀
      const lastPage = sessionStorage.getItem("lastPage") || "/";
      sessionStorage.removeItem("lastPage");

      navigate(lastPage, { replace: true });
    })();
  }, [navigate, refresh]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p>로그인 성공! 이동 중...</p>
    </div>
  );
}
