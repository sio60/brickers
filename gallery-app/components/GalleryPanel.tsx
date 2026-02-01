'use client';

import { ReactNode } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type MenuItem = {
    id: string;
    label: string;
    icon?: ReactNode;
};

type Props = {
    title?: string;
    activeCategory?: string;
    onCategoryChange?: (id: string) => void;
    rightAction?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
};

export default function GalleryPanel({ title, activeCategory, onCategoryChange, rightAction, children, footer }: Props) {
    const { t } = useLanguage();

    const menuItems: MenuItem[] = [
        { id: 'all', label: t.main.galleryList.allCreations },
        { id: 'bookmarks', label: t.main.galleryList.myBookmarks },
    ];

    return (
        <div className="gallery-layout w-full max-w-7xl mx-auto my-6 flex h-[calc(100vh-160px)] gap-6 px-4">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 bg-black rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                <div className="px-8 py-10 border-b border-gray-800">
                    <h2 className="text-yellow-400 text-xs font-black uppercase tracking-[0.2em] mb-2">{t.main.galleryList.workspace}</h2>
                    <h1 className="text-white text-2xl font-black italic tracking-tighter uppercase">{t.main.galleryList.gallery}</h1>
                </div>

                <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onCategoryChange?.(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${activeCategory === item.id
                                ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)] scale-[1.02]'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <span className="text-lg">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-gray-800">
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                        Brickers Pro Version
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-gray-100">
                {/* Header */}
                {(title || rightAction) && (
                    <div className="flex-shrink-0 flex items-center justify-between px-10 py-8 border-b border-gray-50">
                        {title && (
                            <h2 className="text-3xl font-black text-black tracking-tighter italic">
                                {activeCategory === 'all' ? t.main.galleryList.allCreations : t.main.galleryList.myBookmarks}
                            </h2>
                        )}
                        {rightAction && (
                            <div className="flex items-center gap-4">{rightAction}</div>
                        )}
                    </div>
                )}

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex-shrink-0 px-10 py-6 border-t border-gray-50 bg-gray-50/50 flex items-center justify-center">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
