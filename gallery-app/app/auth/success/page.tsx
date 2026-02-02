'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
// import styles from "./AuthSuccess.module.css"; // Removed

export default function AuthSuccessPage() {
    const { refresh } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        let mounted = true;

        const handleSuccess = async () => {
            try {
                // refresh-cookie 기반으로 accessToken 재발급 + me 세팅
                const token = await refresh();

                if (!mounted) return;

                // refresh 실패면 로그인 실패 페이지/홈으로
                if (!token) {
                    sessionStorage.removeItem("lastPage");
                    router.replace("/auth/failure");
                    return;
                }

                // 성공이면 마지막 페이지로 이동
                const lastPage = sessionStorage.getItem("lastPage") || "/";
                sessionStorage.removeItem("lastPage");

                // auth 관련 페이지면 홈으로 (루프 방지)
                if (lastPage.startsWith("/auth")) {
                    router.replace("/");
                    return;
                }

                // 약간의 지연을 주어 애니메이션을 보여줌
                setTimeout(() => {
                    router.replace(lastPage);
                }, 1200);

            } catch (e) {
                if (!mounted) return;
                sessionStorage.removeItem("lastPage");
                router.replace("/auth/failure");
            }
        };

        handleSuccess();

        return () => {
            mounted = false;
        };
    }, [refresh, router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-transparent">
            <div className="font-['Bebas_Neue',sans-serif] text-[48px] text-[#333] mb-10 tracking-[2px] lowercase animate-fadeIn">{t.auth.processing}</div>
            <div className="relative w-[60px] h-[120px]">
                <div className="w-[60px] h-[60px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7eb3,#ff758c)] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),0_0_10px_rgba(255,117,140,0.5)] absolute top-0 z-[2] animate-bounceCustom"></div>
                <div className="w-[60px] h-[15px] bg-[rgba(0,0,0,0.15)] rounded-full absolute bottom-0 left-0 animate-shadowScale blur-[2px] z-[1]"></div>
            </div>
        </div>
    );
}
