import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * OAuth2 로그인 성공 후 처리
 * - 로그인 상태 저장
 * - 이전 페이지로 리다이렉트
 */
export default function AuthSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        // 로그인 상태 저장
        sessionStorage.setItem("isLoggedIn", "true");

        // 이전 페이지로 리다이렉트 (없으면 홈으로)
        const lastPage = sessionStorage.getItem("lastPage") || "/";
        sessionStorage.removeItem("lastPage");

        console.log("로그인 성공! 이전 페이지로 이동:", lastPage);
        navigate(lastPage, { replace: true });
    }, [navigate]);

    return (
        <div style={{ padding: 24, textAlign: "center" }}>
            <p>로그인 성공! 잠시 후 이동합니다...</p>
        </div>
    );
}
