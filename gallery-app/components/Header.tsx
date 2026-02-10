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

    const { showDoneToast, setShowDoneToast, notifications, markAsRead } = useJobStore();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);
    const shouldShowGlobalToast = showDoneToast && pathname !== '/kids/main';

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
                {!pathname.includes('/auth/') ? (
                    <div className="header__actions">
                        {!isLoading ? (
                            isAuthenticated ? (
                                <>
                                    {!isPro && (
                                        <button className="header__upgrade-btn" onClick={() => setIsUpgradeModalOpen(true)}>
                                            {t.header.upgrade}
                                        </button>
                                    )}

                                    {/* Notification Button */}
                                    <div className="relative">
                                        <button
                                            className="header__btn"
                                            data-tooltip={t.header?.notifications || "알림"}
                                            onClick={toggleNotifications}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                            </svg>
                                            {unreadCount > 0 && (
                                                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border-2 border-white translate-x-1 -translate-y-1">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </button>

                                        {/* Dropdown */}
                                        {isNotificationOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[900]" onClick={() => setIsNotificationOpen(false)} />
                                                <div className="notification-dropdown">
                                                    <div className="notification-header">
                                                        {t.header?.notifications || "알림"} ({notifications.length})
                                                    </div>
                                                    <div className="notification-list">
                                                        {notifications.length === 0 ? (
                                                            <div className="notification-empty">
                                                                {t.header?.noNotifications || "새로운 알림이 없습니다."}
                                                            </div>
                                                        ) : (
                                                            notifications.map(note => (
                                                                <div
                                                                    key={note.id}
                                                                    className={`notification-item ${!note.isRead ? 'unread' : ''}`}
                                                                    onClick={() => {
                                                                        markAsRead(note.id);
                                                                        router.push('/mypage?menu=jobs');
                                                                        setIsNotificationOpen(false);
                                                                        setShowDoneToast(false);
                                                                    }}
                                                                >
                                                                    <div className="notification-title">{note.title}</div>
                                                                    <div className="notification-time">
                                                                        {new Date(note.completedAt).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Gallery Button */}
                                    <Link
                                        href="/gallery"
                                        className="header__btn"
                                        data-tooltip={t.header.gallery}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                            <circle cx="9" cy="9" r="2" />
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                        </svg>
                                    </Link>

                                    {/* Logout Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="header__btn"
                                        data-tooltip={t.header.logout}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" x2="9" y1="12" y2="12" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Gallery Button (Visible even when not authenticated) */}
                                    <Link
                                        href="/gallery"
                                        className="header__btn"
                                        data-tooltip={t.header.gallery}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                            <circle cx="9" cy="9" r="2" />
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                        </svg>
                                    </Link>

                                    {/* Login Button (SVG Arrow) */}
                                    <button
                                        onClick={() => setIsLoginModalOpen(true)}
                                        className="header__btn"
                                        data-tooltip={t.header.login}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                            <polyline points="10 17 15 12 10 7" />
                                            <line x1="15" x2="3" y1="12" y2="12" />
                                        </svg>
                                    </button>
                                </>
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

