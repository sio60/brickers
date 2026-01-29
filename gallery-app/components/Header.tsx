'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check for auth token in localStorage (managed by Vite app)
        // Since they are on the same domain, localStorage *might* not be shared if port differs in dev, 
        // but in prod (brickers.shop) they are same domain. 
        // However, Next.js runs on /gallery path. LocalStorage is per origin. 
        // IF Nginx proxies /gallery to Next.js, the origin is https://brickers.shop for BOTH.
        // So localStorage SHOULD be accessible.
        const token = localStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <nav className="w-full h-[72px] flex items-center justify-between px-5 border-b border-[#e0e0e0] bg-white fixed top-0 left-0 z-50">
            {/* Logo - Links to Main App Home */}
            <a href="/" className="h-12 w-auto cursor-pointer flex items-center relative">
                <Image
                    src="/gallery/logo.png"
                    alt="BRICKERS"
                    width={150}
                    height={48}
                    className="h-full w-auto object-contain"
                    priority
                />
            </a>

            <div className="flex gap-3">
                {isLoggedIn ? (
                    <Link
                        href="/my"
                        className="bg-white text-black border-2 border-black px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-black hover:text-white transition-colors"
                    >
                        내 갤러리
                    </Link>
                ) : (
                    <a
                        href="/?login=true"
                        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        로그인 / 앱으로 이동
                    </a>
                )}
            </div>
        </nav>
    );
}
