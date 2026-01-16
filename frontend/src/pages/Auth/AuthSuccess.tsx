// src/pages/Auth/AuthSuccess.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AuthSuccess() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSuccess = async () => {
      // ✅ 1. 서버 세션 정보를 프론트 상태로 동기화
      await refresh();
      // ✅ 2. 저장해둔 마지막 페이지 혹은 홈으로 이동
      const lastPage = sessionStorage.getItem("lastPage") || "/";
      navigate(lastPage, { replace: true });
    };

    handleSuccess();
  }, [refresh, navigate]);

  
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>로그인 성공! 잠시 후 이동합니다...</h2>
    </div>
  );
}