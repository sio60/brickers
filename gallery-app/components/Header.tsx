'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Check for auth token in localStorage (managed by Vite app)
        // Same origin on brickers.shop, so localStorage is shared
        const token = localStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
    }, []);

    // Determine which page we're on
    const isMyGalleryPage = pathname === '/my';
    const isBookmarksPage = pathname === '/my/bookmarks';

    return (
        <header className="fixed top-0 left-0 w-full h-[72px] flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50">
            {/* Logo - Centered */}
            <a href="/" className="h-12 cursor-pointer">
                <Image
                    src="/gallery/logo.png"
                    alt="BRICKERS"
                    width={150}
                    height={48}
                    className="h-full w-auto object-contain"
                    priority
                />
            </a>

            {/* Actions - Positioned absolute right */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                {isLoggedIn ? (
                    <>
                        {isMyGalleryPage && !isBookmarksPage ? (
                            <Link
                                href="/my/bookmarks"
                                className="bg-white text-black border-2 border-black px-3 py-1.5 rounded-lg text-base tracking-wide cursor-pointer transition-all duration-200 hover:bg-black hover:text-white"
                            >
                                북마크
                            </Link>
                        ) : isBookmarksPage ? (
                            <Link
                                href="/my"
                                className="bg-white text-black border-2 border-black px-3 py-1.5 rounded-lg text-base tracking-wide cursor-pointer transition-all duration-200 hover:bg-black hover:text-white"
                            >
                                내 갤러리
                            </Link>
                        ) : (
                            <Link
                                href="/my"
                                className="bg-white text-black border-2 border-black px-3 py-1.5 rounded-lg text-base tracking-wide cursor-pointer transition-all duration-200 hover:bg-black hover:text-white"
                            >
                                내 갤러리
                            </Link>
                        )}
                    </>
                ) : (
                    <a
                        href="/?login=true"
                        className="bg-white text-black border-2 border-black px-3 py-1.5 rounded-lg text-base tracking-wide cursor-pointer transition-all duration-200 hover:bg-black hover:text-white"
                    >
                        로그인
                    </a>
                )}
            </div>
        </header>
    );
}
