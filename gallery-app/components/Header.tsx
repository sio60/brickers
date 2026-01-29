"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export default function Header() {
    const { t } = useLanguage();
    const { isAuthenticated, logout, isLoading, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    // 업그레이드 여부 확인
    const isPro = user?.membershipPlan === "PRO";

    return (
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
                {/* 갤러리 링크 */}
                <Link href="/gallery" className="header__btn">
                    {t.header.gallery}
                </Link>

                {!isLoading && isAuthenticated && (
                    <>
                        {!isPro && (
                            <button className="header__btn" onClick={() => {/* Upgrade modal logic if integrated */ }}>
                                {t.header.upgrade}
                            </button>
                        )}
                        <Link href="/mypage" className="header__btn">
                            {t.header.myPage}
                        </Link>
                        <button onClick={handleLogout} className="header__btn">
                            {t.header.logout}
                        </button>
                    </>
                )}

                {!isLoading && !isAuthenticated && (
                    <Link href="/?login=true" className="header__btn">
                        {t.header.login}
                    </Link>
                )}
            </div>
        </header>
    );
}

