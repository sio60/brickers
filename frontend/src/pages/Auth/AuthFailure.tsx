import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AuthFailure() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    (async () => {
      // 실패면 로그인 상태 정리
      await refresh();

      // 실패 시에도 lastPage는 지워주는 게 깔끔
      sessionStorage.removeItem("lastPage");

      const timer = setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);

      return () => clearTimeout(timer);
    })();
  }, [navigate, refresh]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: "red" }}>로그인에 실패했습니다.</p>
      <p>홈으로 이동합니다...</p>
    </div>
  );
}
