"use client";

import Image from 'next/image';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
    const { t } = useLanguage();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            setIsLoggedIn(!!token);
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsLoggedIn(false);
        window.dispatchEvent(new Event('storage'));
        window.location.href = '/';
    };

    const isLandingPage = pathname === '/';

    return (
        <header className="fixed top-0 left-0 w-full h-[72px] flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50">
            {/* Logo - Centered */}
            <Link href="/" className="h-12 cursor-pointer flex items-center justify-center">
                <Image
                    src="/logo.png"
                    alt="BRICKERS"
                    width={160}
                    height={48}
                    className="h-full w-auto object-contain"
                    priority
                />
            </Link>

            {/* Actions - Positioned absolute right */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                {/* 갤러리 링크는 항상 노출 (현재 갤러리 페이지가 아닐 때만 혹은 항상) */}
                <Link
                    href="/gallery"
                    className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                >
                    {t.header.gallery}
                </Link>

                {isLoggedIn ? (
                    <>
                        <Link
                            href="/mypage"
                            className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                            {t.header.myPage}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                            {t.header.logout}
                        </button>
                    </>
                ) : (
                    <Link
                        href="/?login=true"
                        className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                    >
                        {t.header.login}
                    </Link>
                )}
            </div>
        </header>
    );
}
