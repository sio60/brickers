"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './common/LoginModal';
import UpgradeModal from './UpgradeModal';
import { useJobStore, type Notification } from '../stores/jobStore';
import './Header.css';

const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

const toApiUrl = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/') && API_BASE) return `${API_BASE}${path}`;
    return path;
};

type ServerNotification = {
    id: string;
    title: string;
    message?: string;
    linkUrl?: string;
    read: boolean;
    createdAt: string;
};

function HeaderContent() {
    const { t } = useLanguage();
    const { isAuthenticated, logout, isLoading, user, authFetch } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const { showDoneToast, setShowDoneToast, notifications, markAsRead, upsertNotifications } = useJobStore();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [hasLocalToken, setHasLocalToken] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);
    const shouldShowGlobalToast = showDoneToast && pathname !== '/kids/main';
    const isAuthReady = isAuthenticated || hasLocalToken;

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const refreshLocalTokenState = useCallback(() => {
        if (typeof window === 'undefined') return;
        setHasLocalToken(!!localStorage.getItem('accessToken'));
    }, []);

    const requestWithBestAuth = useCallback(async (path: string, init: RequestInit = {}) => {
        if (isAuthenticated) {
            return authFetch(path, init);
        }

        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (storedToken) {
            const headers = new Headers(init.headers || {});
            if (init.body && !headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
            headers.set('Authorization', `Bearer ${storedToken}`);

            const res = await fetch(toApiUrl(path), { ...init, headers, credentials: 'include' });
            if (res.status !== 401) return res;
        }

        const fallback = await authFetch(path, init);
        if (fallback.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            setHasLocalToken(false);
        }
        return fallback;
    }, [authFetch, isAuthenticated]);

    // URL에 ?login=true가 있으면 자동으로 로그인 모달 열기
    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthReady) {
            setIsLoginModalOpen(true);
        }
    }, [searchParams, isAuthReady]);

    useEffect(() => {
        refreshLocalTokenState();
        if (typeof window === 'undefined') return;

        window.addEventListener('focus', refreshLocalTokenState);
        window.addEventListener('storage', refreshLocalTokenState);

        return () => {
            window.removeEventListener('focus', refreshLocalTokenState);
            window.removeEventListener('storage', refreshLocalTokenState);
        };
    }, [refreshLocalTokenState]);

    // 토스트 자동 숨김 (5초)
    useEffect(() => {
        if (showDoneToast) {
            const timer = setTimeout(() => {
                setShowDoneToast(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showDoneToast, setShowDoneToast]);

    useEffect(() => {
        if (isLoading || !isAuthReady) return;

        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const res = await requestWithBestAuth('/api/my/notifications?page=0&size=30');
                if (!res.ok) return;

                const data = await res.json();
                const items: ServerNotification[] = Array.isArray(data?.content) ? data.content : [];
                if (cancelled) return;

                upsertNotifications(
                    items.map((item) => ({
                        id: item.id,
                        title: item.title,
                        completedAt: item.createdAt,
                        isRead: item.read,
                        source: 'server' as const,
                        link: item.linkUrl || '/mypage',
                        message: item.message,
                    }))
                );
            } catch (error) {
                console.error('[Header] Failed to fetch notifications', error);
            }
        };

        fetchNotifications();
        const pollId = setInterval(fetchNotifications, 15000);

        return () => {
            cancelled = true;
            clearInterval(pollId);
        };
    }, [isLoading, isAuthReady, requestWithBestAuth, upsertNotifications]);

    const handleLogout = async () => {
        await logout();
    };

    const handleNotificationClick = async (note: Notification) => {
        markAsRead(note.id);

        if (note.source === 'server') {
            try {
                await requestWithBestAuth(`/api/my/notifications/${note.id}/read`, { method: 'PATCH' });
            } catch (error) {
                console.error('[Header] Failed to mark notification as read', error);
            }
        }

        router.push(note.link || '/mypage?menu=jobs');
        setIsNotificationOpen(false);
        setShowDoneToast(false);
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
                            isAuthReady ? (
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
                                                                    onClick={() => handleNotificationClick(note)}
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

