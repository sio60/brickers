'use client';

import React from "react";
import type { Notification } from '../../../stores/jobStore';

interface NotificationDropdownProps {
    t: any;
    styles: Record<string, string>;
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onNotificationClick: (note: Notification) => void;
}

export default function NotificationDropdown({
    t,
    styles,
    notifications,
    unreadCount,
    isOpen,
    onToggle,
    onClose,
    onNotificationClick,
}: NotificationDropdownProps) {
    const btnClass = `bg-transparent text-black border-none p-2 cursor-pointer transition-transform duration-200 ease-out flex items-center justify-center relative hover:scale-110 hover:bg-transparent hover:text-black ${styles.header__btn}`;

    return (
        <div className="relative">
            <button
                className={btnClass}
                data-tooltip={t.header?.notifications || "알림"}
                onClick={onToggle}
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

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[900]" onClick={onClose} />
                    <div className={`absolute top-[60px] right-5 w-80 bg-white border border-[#e0e0e0] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[1000] flex flex-col overflow-hidden ${styles['notification-dropdown']}`}>
                        <div className="px-4 py-3 border-b border-[#f0f0f0] font-bold text-sm bg-[#fafafa] text-[#333]">
                            {t.header?.notifications || "알림"} ({notifications.length})
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-[#888] text-sm">
                                    {t.header?.noNotifications || "새로운 알림이 없습니다."}
                                </div>
                            ) : (
                                notifications.map(note => (
                                    <div
                                        key={note.id}
                                        className={`px-4 py-3 border-b border-[#f0f0f0] cursor-pointer transition-colors duration-200 flex flex-col gap-1 hover:bg-[#f8f9fa] last:border-b-0 ${!note.isRead ? 'bg-[#f0f7ff]' : ''}`}
                                        onClick={() => onNotificationClick(note)}
                                    >
                                        <div className="text-sm font-medium text-[#333]">{note.title}</div>
                                        <div className="text-xs text-[#888]">
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
    );
}
