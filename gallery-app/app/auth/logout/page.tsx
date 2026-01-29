'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "../success/AuthSuccess.module.css";

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
        <div className={styles.container}>
            <div className={styles.text}>{t.auth.loggingOut}</div>
            <div className={styles.ballWrapper}>
                <div className={styles.ball}></div>
                <div className={styles.shadow}></div>
            </div>
        </div>
    );
}
