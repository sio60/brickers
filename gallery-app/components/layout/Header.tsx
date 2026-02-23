"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../common/LoginModal';
import UpgradeModal from '../common/UpgradeModal';
import { useJobStore, type Notification } from '../../stores/jobStore';
import AuthActions from './header/AuthActions';
import styles from './Header.module.css';

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
    const shouldShowGlobalToast = showDoneToast && pathname !== '/kids/main';
    const isAuthReady = isAuthenticated || hasLocalToken;

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const refreshLocalTokenState = useCallback(() => {
        if (typeof window === 'undefined') return;
        setHasLocalToken(!!localStorage.getItem('accessToken'));
    }, []);

    const requestWithBestAuth = useCallback(async (path: string, init: RequestInit = {}) => {
        if (isAuthenticated) return authFetch(path, init);

        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (storedToken) {
            const headers = new Headers(init.headers || {});
            if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
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

    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthReady) setIsLoginModalOpen(true);
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

    useEffect(() => {
        if (showDoneToast) {
            const timer = setTimeout(() => setShowDoneToast(false), 5000);
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
                        id: item.id, title: item.title, completedAt: item.createdAt,
                        isRead: item.read, source: 'server' as const,
                        link: item.linkUrl || '/mypage', message: item.message,
                    }))
                );
            } catch (error) {
                console.error('[Header] Failed to fetch notifications', error);
            }
        };

        fetchNotifications();
        const pollId = setInterval(fetchNotifications, 15000);
        return () => { cancelled = true; clearInterval(pollId); };
    }, [isLoading, isAuthReady, requestWithBestAuth, upsertNotifications]);

    const handleLogout = async () => { await logout(); };

    const handleNotificationClick = async (note: Notification) => {
        markAsRead(note.id);
        if (note.source === 'server') {
            try { await requestWithBestAuth(`/api/my/notifications/${note.id}/read`, { method: 'PATCH' }); }
            catch (error) { console.error('[Header] Failed to mark notification as read', error); }
        }
        router.push(note.link || '/mypage?menu=jobs');
        setIsNotificationOpen(false);
        setShowDoneToast(false);
    };

    const isPro = user?.membershipPlan === "PRO";

    return (
        <>
            <header className="fixed top-0 left-0 w-full h-[72px] shrink-0 flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] box-border z-50">
                <Link href="/" className="cursor-pointer">
                    <Image src="/logo.png" alt="BRICKERS" width={160} height={48} className="h-12 w-auto object-contain cursor-pointer" priority />
                </Link>

                {!pathname.includes('/auth/') && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                        <AuthActions
                            t={t}
                            styles={styles}
                            isAuthReady={isAuthReady}
                            isPro={isPro}
                            notifications={notifications}
                            unreadCount={unreadCount}
                            isNotificationOpen={isNotificationOpen}
                            onToggleNotifications={() => setIsNotificationOpen(!isNotificationOpen)}
                            onCloseNotifications={() => setIsNotificationOpen(false)}
                            onNotificationClick={handleNotificationClick}
                            onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                            onLoginClick={() => setIsLoginModalOpen(true)}
                            onLogout={handleLogout}
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </header>

            {shouldShowGlobalToast && (
                <div className={`fixed top-[100px] left-1/2 -translate-x-1/2 bg-white border-[3px] border-black text-black px-10 py-5 z-[9999] font-bold text-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-xl whitespace-nowrap ${styles.toast}`} onClick={() => setShowDoneToast(false)}>
                    {t.kids.generate.complete}
                </div>
            )}

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
        </>
    );
}

export default function Header() {
    return (
        <Suspense fallback={<header className="fixed top-0 left-0 w-full h-[72px] shrink-0 flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] box-border z-50"><div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3" /></header>}>
            <HeaderContent />
        </Suspense>
    );
}
