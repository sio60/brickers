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
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[3000] backdrop-blur-[4px]"
            onClick={onClose}
        >
            <div
                className={`bg-white p-10 rounded-3xl w-full max-w-[400px] flex flex-col items-center shadow-[0_10px_25px_rgba(0,0,0,0.2)] relative ${styles.modal}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] text-black z-[100] hover:rotate-90 hover:scale-110"
                    onClick={onClose}
                    aria-label="close"
                >
                    ✕
                </button>
                <h2 className="text-[32px] text-black m-0 mb-6 tracking-[1px] font-extrabold">
                    {t.auth.title}
                </h2>

                <button
                    className="w-full h-14 rounded-xl border-none text-base font-semibold flex items-center justify-center relative cursor-pointer mb-4 transition-[transform,box-shadow] duration-100 active:scale-[0.98] bg-[#fee500] text-black/85"
                    onClick={handleKakaoLogin}
                >
                    <Image src="/kakao.png" alt="Kakao" width={24} height={24} className="absolute left-5 object-contain" />
                    <span className="flex-1 text-center">{t.auth.kakao}</span>
                </button>

                <button
                    className="w-full h-14 rounded-xl text-base font-semibold flex items-center justify-center relative cursor-pointer transition-[transform,box-shadow] duration-100 active:scale-[0.98] bg-white text-black border border-[#dadce0]"
                    onClick={handleGoogleLogin}
                >
                    <Image src="/google.png" alt="Google" width={24} height={24} className="absolute left-5 object-contain" />
                    <span className="flex-1 text-center">{t.auth.google}</span>
                </button>
            </div>
        </div>
    );
}
