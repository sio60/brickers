'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthFailurePage() {
    const router = useRouter();
    const { refresh } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        (async () => {
            // 실패면 로그인 상태 정리
            await refresh();

            // 실패 시에도 lastPage는 지워주는 게 깔끔
            sessionStorage.removeItem("lastPage");

            const timer = setTimeout(() => {
                router.replace("/");
            }, 1500);

            return () => clearTimeout(timer);
        })();
    }, [router, refresh]);

    return (
        <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ color: "red" }}>{t.auth.failed}</p>
            <p>{t.auth.redirecting}</p>
        </div>
    );
}
