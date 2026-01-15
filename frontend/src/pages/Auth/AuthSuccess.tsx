import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Login Success! Checking session...");

        // 1. 세션 확인 (백엔드 호출)
        fetch("/auth/me") // Proxy 설정이 되어있다고 가정 (안되어있으면 http://localhost:8080/auth/me)
            .then(res => res.json())
            .then(data => {
                console.log("Logged in user:", data);
                // 2. 1초 뒤 메인으로 이동
                setTimeout(() => {
                    navigate("/", { replace: true });
                }, 1000);
            })
            .catch(err => {
                console.error("Session check failed:", err);
                navigate("/", { replace: true });
            });
    }, [navigate]);

    return (
        <div style={{ padding: "50px", textAlign: "center" }}>
            <h2>로그인 성공! 🎉</h2>
            <p>메인 페이지로 이동합니다...</p>
        </div>
    );
}
