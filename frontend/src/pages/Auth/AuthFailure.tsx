import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * OAuth2 로그인 실패 처리
 */
export default function AuthFailure() {
    const navigate = useNavigate();

    useEffect(() => {
        console.error("로그인 실패");
        // 3초 후 홈으로 이동
        const timer = setTimeout(() => {
            navigate("/", { replace: true });
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ color: "red" }}>로그인에 실패했습니다.</p>
            <p>잠시 후 홈 화면으로 이동합니다...</p>
        </div>
    );
}
