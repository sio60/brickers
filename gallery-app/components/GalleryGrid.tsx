'use client';

import GalleryCard from './GalleryCard';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '../contexts/LanguageContext';

type Props = {
    items: GalleryItem[];
    isLoggedIn: boolean;
    onLikeToggle?: (id: string, currentState: boolean) => void;
    onBookmarkToggle?: (id: string, currentState: boolean) => void;
    onLoginRequired?: () => void;
};

export default function GalleryGrid({ items, isLoggedIn, onLikeToggle, onBookmarkToggle, onLoginRequired }: Props) {
    const { t } = useLanguage();

    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-lg font-medium">{t.main.noItems}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 justify-center">
            {items.map((item) => (
                <GalleryCard
                    key={item.id}
                    item={item}
                    isLoggedIn={isLoggedIn}
                    onLikeToggle={onLikeToggle}
                    onBookmarkToggle={onBookmarkToggle}
                    onLoginRequired={onLoginRequired}
                />
            ))}
        </div>
    );
}
