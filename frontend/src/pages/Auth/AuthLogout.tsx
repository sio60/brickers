import { useEffect } from "react";
import "./AuthSuccess.css";

interface AuthLogoutProps {
    onLogoutComplete: () => void;
}

export default function AuthLogout({ onLogoutComplete }: AuthLogoutProps) {
    useEffect(() => {
        // 1.2초 정도 보여주고 실제 로그아웃 처리
        const timer = setTimeout(() => {
            onLogoutComplete();
        }, 1200);

        return () => clearTimeout(timer);
    }, [onLogoutComplete]);

    return (
        <div className="authSuccess__container" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "white" }}>
            <div className="authSuccess__text">logout...</div>
            <div className="authSuccess__ballWrapper">
                <div className="authSuccess__ball" style={{ background: "radial-gradient(circle at 30% 30%, #4ade80, #22c55e)", boxShadow: "inset -5px -5px 15px rgba(0, 0, 0, 0.2), 0 0 10px rgba(34, 197, 94, 0.5)" }}></div>
                <div className="authSuccess__shadow"></div>
            </div>
        </div>
    );
}
