'use client';

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./LoginModal.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// 백엔드 OAuth2 로그인 URL
const BACKEND_KAKAO_LOGIN = `${API_BASE}/auth/kakao`;
const BACKEND_GOOGLE_LOGIN = `${API_BASE}/auth/google`;

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const saveLastPage = () => {
        // returnUrl 파라미터가 있으면 그걸 사용 (갤러리에서 로그인 시)
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');

        let lastPage: string;
        if (returnUrl) {
            lastPage = returnUrl;
        } else {
            // login 파라미터 제거한 현재 URL
            urlParams.delete('login');
            const cleanSearch = urlParams.toString();
            lastPage = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
        }

        sessionStorage.setItem("lastPage", lastPage);
    };

    const handleKakaoLogin = () => {
        saveLastPage();
        window.location.href = BACKEND_KAKAO_LOGIN;
    };

    const handleGoogleLogin = () => {
        saveLastPage();
        window.location.href = BACKEND_GOOGLE_LOGIN;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="close">✕</button>
                <h2 className={styles.title}>{t.auth.title}</h2>

                <button
                    className={`${styles.button} ${styles.kakao}`}
                    onClick={handleKakaoLogin}
                >
                    <Image src="/kakao.png" alt="Kakao" width={24} height={24} className={styles.icon} />
                    <span className={styles.paramName}>{t.auth.kakao}</span>
                </button>

                <button
                    className={`${styles.button} ${styles.google}`}
                    onClick={handleGoogleLogin}
                >
                    <Image src="/google.png" alt="Google" width={24} height={24} className={styles.icon} />
                    <span className={styles.paramName}>{t.auth.google}</span>
                </button>
            </div>
        </div>
    );
}
