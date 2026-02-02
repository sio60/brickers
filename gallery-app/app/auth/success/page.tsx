'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./AuthSuccess.module.css";

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
        <div className={styles.container}>
            <div className={styles.text}>{t.auth.processing}</div>
            <div className={styles.ballWrapper}>
                <div className={styles.ball}></div>
                <div className={styles.shadow}></div>
            </div>
        </div>
    );
}
