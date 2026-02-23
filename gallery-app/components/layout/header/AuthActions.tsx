'use client';

import React from "react";
import Link from 'next/link';
import type { Notification } from '../../../stores/jobStore';
import NotificationDropdown from './NotificationDropdown';

interface AuthActionsProps {
    t: any;
    styles: Record<string, string>;
    isAuthReady: boolean;
    isPro: boolean;
    notifications: Notification[];
    unreadCount: number;
    isNotificationOpen: boolean;
    onToggleNotifications: () => void;
    onCloseNotifications: () => void;
    onNotificationClick: (note: Notification) => void;
    onUpgradeClick: () => void;
    onLoginClick: () => void;
    onLogout: () => void;
    isLoading: boolean;
}

export default function AuthActions({
    t,
    styles,
    isAuthReady,
    isPro,
    notifications,
    unreadCount,
    isNotificationOpen,
    onToggleNotifications,
    onCloseNotifications,
    onNotificationClick,
    onUpgradeClick,
    onLoginClick,
    onLogout,
    isLoading,
}: AuthActionsProps) {
    if (isLoading) return null;

    const btnClass = `bg-transparent text-black border-none p-2 cursor-pointer transition-transform duration-200 ease-out flex items-center justify-center relative hover:scale-110 hover:bg-transparent hover:text-black ${styles.header__btn}`;

    if (isAuthReady) {
        return (
            <>
                {!isPro && (
                    <button className="bg-[#ffe135] text-black border-2 border-black rounded-[20px] px-4 py-1.5 font-black text-[13px] cursor-pointer transition-all duration-200 mr-1 hover:bg-[#ffd700] hover:-translate-y-px" onClick={onUpgradeClick}>
                        {t.header.upgrade}
                    </button>
                )}

                <NotificationDropdown
                    t={t}
                    styles={styles}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isOpen={isNotificationOpen}
                    onToggle={onToggleNotifications}
                    onClose={onCloseNotifications}
                    onNotificationClick={onNotificationClick}
                />

                <Link href="/gallery" className={btnClass} data-tooltip={t.header.gallery}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                </Link>

                <button onClick={onLogout} className={btnClass} data-tooltip={t.header.logout}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                </button>
            </>
        );
    }

    return (
        <>
            <Link href="/gallery" className={btnClass} data-tooltip={t.header.gallery}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            </Link>

            <button onClick={onLoginClick} className={btnClass} data-tooltip={t.header.login}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
            </button>
        </>
    );
}
