"use client";

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './common/LoginModal';
import UpgradeModal from './UpgradeModal';
// import './Header.css'; // Removed

function HeaderContent() {
    const { t } = useLanguage();
    const { isAuthenticated, logout, isLoading, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
            <header className="fixed top-0 left-0 w-full h-[72px] shrink-0 flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50">
                {/* Logo - Centered */}
                <Link href="/" className="cursor-pointer">
                    <Image
                        src="/logo.png"
                        alt="BRICKERS"
                        width={160}
                        height={48}
                        className="h-[48px] w-auto object-contain cursor-pointer"
                        priority
                    />
                </Link>

                {/* Actions - Positioned absolute right */}
                {/* Hide buttons on auth success/logout pages */}
                {!pathname.includes('/auth/') ? (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                        <Link href="/gallery" className="bg-white text-black border-2 border-black rounded-lg px-4 py-1.5 text-[16px] font-bold tracking-wider cursor-pointer transition duration-200 ease-in-out no-underline flex items-center justify-center hover:bg-black hover:text-white">
                            {t.header.gallery}
                        </Link>
                        {!isLoading ? (
                            isAuthenticated ? (
                                <>
                                    {!isPro && (
                                        <button className="bg-white text-black border-2 border-black rounded-lg px-4 py-1.5 text-[16px] font-bold tracking-wider cursor-pointer transition duration-200 ease-in-out no-underline flex items-center justify-center hover:bg-black hover:text-white" onClick={() => setIsUpgradeModalOpen(true)}>
                                            {t.header.upgrade}
                                        </button>
                                    )}
                                    <button onClick={handleLogout} className="bg-white text-black border-2 border-black rounded-lg px-4 py-1.5 text-[16px] font-bold tracking-wider cursor-pointer transition duration-200 ease-in-out no-underline flex items-center justify-center hover:bg-black hover:text-white">
                                        {t.header.logout}

                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsLoginModalOpen(true)} className="bg-white text-black border-2 border-black rounded-lg px-4 py-1.5 text-[16px] font-bold tracking-wider cursor-pointer transition duration-200 ease-in-out no-underline flex items-center justify-center hover:bg-black hover:text-white">
                                    {t.header.login}
                                </button>
                            )
                        ) : null}
                    </div>
                ) : null}
            </header>

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
        <Suspense fallback={<header className="fixed top-0 left-0 w-full h-[72px] shrink-0 flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50"><div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3" /></header>}>
            <HeaderContent />
        </Suspense>
    );
}

