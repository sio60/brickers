"use client";

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './common/LoginModal';
import './Header.css';

function HeaderContent() {
    const { t } = useLanguage();
    const { isAuthenticated, logout, isLoading, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // URL에 ?login=true가 있으면 자동으로 로그인 모달 열기
    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthenticated) {
            setIsLoginModalOpen(true);
        }
    }, [searchParams, isAuthenticated]);

    const handleLogout = async () => {
        await logout();
    };

    // 업그레이드 여부 확인
    const isPro = user?.membershipPlan === "PRO";
    const isAdmin = user?.role === "ADMIN";

    return (
        <>
            <header className="header">
                {/* Logo - Centered */}
                <Link href="/" className="cursor-pointer">
                    <Image
                        src="/logo.png"
                        alt="BRICKERS"
                        width={160}
                        height={48}
                        className="header__logo"
                        priority
                    />
                </Link>

                {/* Actions - Positioned absolute right */}
                <div className="header__actions">
                    <Link href="/gallery" className="header__btn">
                        {t.header.gallery}
                    </Link>
                    {!isLoading ? (
                        isAuthenticated ? (
                            <>
                                {!isPro && (
                                    <button className="header__btn" onClick={() => {/* Upgrade modal logic */ }}>
                                        {t.header.upgrade}
                                    </button>
                                )}
                                <button onClick={handleLogout} className="header__btn">
                                    {t.header.logout}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsLoginModalOpen(true)} className="header__btn">
                                {t.header.login}
                            </button>
                        )
                    ) : null}
                </div>
            </header>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </>
    );
}

export default function Header() {
    return (
        <Suspense fallback={<header className="header"><div className="header__actions" /></header>}>
            <HeaderContent />
        </Suspense>
    );
}

