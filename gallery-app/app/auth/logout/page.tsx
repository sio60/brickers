'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
// import styles from "../success/AuthSuccess.module.css"; // Removed

export default function LogoutPage() {
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        // 로그아웃 애니메이션을 잠시 보여준 후 홈으로 이동
        const timer = setTimeout(() => {
            router.replace("/");
        }, 1200);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-transparent">
            <div className="font-['Bebas_Neue',sans-serif] text-[48px] text-[#333] mb-10 tracking-[2px] lowercase animate-fadeIn">{t.auth.loggingOut}</div>
            <div className="relative w-[60px] h-[120px]">
                <div className="w-[60px] h-[60px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7eb3,#ff758c)] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),0_0_10px_rgba(255,117,140,0.5)] absolute top-0 z-[2] animate-bounceCustom"></div>
                <div className="w-[60px] h-[15px] bg-[rgba(0,0,0,0.15)] rounded-full absolute bottom-0 left-0 animate-shadowScale blur-[2px] z-[1]"></div>
            </div>
        </div>
    );
}
