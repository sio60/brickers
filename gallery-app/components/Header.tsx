'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
    const { t } = useLanguage();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Check for auth token in localStorage (managed by Vite app)
        const token = localStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsLoggedIn(false);
        // Navigate to home (browser navigation)
        window.location.href = '/';
    };

    const isMyPage = pathname === '/my';

    return (
        <header className="fixed top-0 left-0 w-full h-[72px] flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50">
            {/* Logo - Centered */}
            <a href="/" className="h-12 cursor-pointer flex items-center justify-center">
                <Image
                    src="/gallery/logo.png"
                    alt="BRICKERS"
                    width={160}
                    height={48}
                    className="h-full w-auto object-contain"
                    priority
                />
            </a>

            {/* Actions - Positioned absolute right */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                {isLoggedIn ? (
                    <>
                        {isMyPage ? (
                            <a
                                href="/gallery"
                                className="px-3 py-1.5 text-[15px] font-semibold text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all tracking-wider"
                            >
                                {t.header.gallery}
                            </a>
                        ) : (
                            <a
                                href="/gallery/my"
                                className="px-3 py-1.5 text-[15px] font-semibold text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all tracking-wider"
                            >
                                {t.header.myGallery}
                            </a>
                        )}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-semibold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                            {t.header.logout}
                        </button>
                    </>
                ) : (
                    <a
                        href="/?login=true"
                        className="px-4 py-2 text-sm font-semibold bg-black text-white border-2 border-black rounded-lg hover:bg-gray-800 transition-all"
                    >
                        {t.header.login}
                    </a>
                )}
            </div>
        </header>
    );
}
