"use client";

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './common/LoginModal';
import UpgradeModal from './UpgradeModal';
import { useJobStore } from '../stores/jobStore';
import './Header.css';

function HeaderContent() {
    const { t } = useLanguage();
    const { isAuthenticated, logout, isLoading, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const { showDoneToast, setShowDoneToast } = useJobStore();

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // URL에 ?login=true가 있으면 자동으로 로그인 모달 열기
    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthenticated) {
            setIsLoginModalOpen(true);
        }
    }, [searchParams, isAuthenticated]);

    // 토스트 자동 숨김 (5초)
    useEffect(() => {
        if (showDoneToast) {
            const timer = setTimeout(() => {
                setShowDoneToast(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showDoneToast, setShowDoneToast]);

    const handleLogout = async () => {
        await logout();
    };

    // 업그레이드 여부 확인
    const isPro = user?.membershipPlan === "PRO";
    const isAdmin = user?.role === "ADMIN";

    // "완성 화면 벗어나면 뜨게 해줘" -> /kids/main 이 아닐 때만 표시
    const shouldShowGlobalToast = showDoneToast && pathname !== '/kids/main';

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
                {/* Hide buttons on auth success/logout pages */}
                {!pathname.includes('/auth/') ? (
                    <div className="header__actions">
                        <Link href="/gallery" className="header__btn">
                            {t.header.gallery}
                        </Link>
                        {!isLoading ? (
                            isAuthenticated ? (
                                <>
                                    {!isPro && (
                                        <button className="header__btn" onClick={() => setIsUpgradeModalOpen(true)}>
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
                ) : null}
            </header>

            {/* 글로벌 완료 토스트 */}
            {shouldShowGlobalToast && (
                <div className="toast" onClick={() => setShowDoneToast(false)}>
                    {t.kids.generate.complete}
                </div>
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
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

