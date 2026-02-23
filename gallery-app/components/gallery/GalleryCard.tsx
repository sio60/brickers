'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { GalleryItem } from '../../types/gallery';

export type { GalleryItem };

type Props = {
    item: GalleryItem;
    isLoggedIn: boolean;
    onLikeToggle?: (id: string, currentState: boolean) => void;
    onBookmarkToggle?: (id: string, currentState: boolean) => void;
    onLoginRequired?: () => void;
};

// Check if URL is valid (starts with http/https, is a blob, or is a relative path)
function isValidImageUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('blob:');
}

export default function GalleryCard({ item, isLoggedIn, onLikeToggle, onBookmarkToggle, onLoginRequired }: Props) {
    const { t } = useLanguage();
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;
    const hasValidImage = isValidImageUrl(displayImageUrl);
    const displayedBrickCount = item.parts ?? item.brickCount;

    const handleLikeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            onLoginRequired?.();
            return;
        }

        const isCurrentlyLiked = item.myReaction === 'LIKE';
        onLikeToggle?.(item.id, isCurrentlyLiked);
    };

    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            onLoginRequired?.();
            return;
        }

        const isCurrentlyBookmarked = !!item.bookmarked;
        onBookmarkToggle?.(item.id, isCurrentlyBookmarked);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };

    return (
        <Link href={`/gallery/${slug}`} className="block group">
            <div className="gallery-card bg-white rounded-3xl overflow-hidden border-[3px] border-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-300">
                {/* Thumbnail Area */}
                <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden border-b-[3px] border-black">
                    {hasValidImage ? (
                        <img
                            src={displayImageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200 p-4">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                        </div>
                    )}

                    {/* Gradient Overlay for Icon Visibility */}
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/50 to-transparent z-0 pointer-events-none" />

                    {/* Overlay Action Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                        {/* Like button */}
                        <button
                            onClick={handleLikeClick}
                            className="flex items-center justify-center w-8 h-8 transition-transform active:scale-95 text-white drop-shadow-md"
                            aria-label={item.myReaction === 'LIKE' ? (t.galleryCard?.likeRemove || 'Remove like') : (t.galleryCard?.likeAdd || 'Add like')}
                        >
                            <svg
                                className={`w-7 h-7 ${item.myReaction === 'LIKE' ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'}`}
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                />
                            </svg>
                        </button>

                        {/* Bookmark button */}
                        {onBookmarkToggle && (
                            <button
                                onClick={handleBookmarkClick}
                                className="flex items-center justify-center w-8 h-8 transition-transform active:scale-95 text-white drop-shadow-md"
                                aria-label={item.bookmarked ? (t.galleryCard?.bookmarkRemove || 'Remove bookmark') : (t.galleryCard?.bookmarkAdd || 'Add bookmark')}
                            >
                                <svg
                                    className={`w-7 h-7 ${item.bookmarked ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-white'}`}
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex flex-col gap-1">
                    {/* Title & User Info */}
                    <div className="flex items-center justify-between w-full">
                        <h3 className="font-extrabold text-[#000] text-[16px] leading-tight truncate mr-2 group-hover:text-amber-500 transition-colors">
                            {item.title}
                        </h3>

                        {/* Nickname & Avatar */}
                        <div className="flex items-center gap-1.5 shrink-0 max-w-[50%]">
                            {/* Profile Image / Avatar */}
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                                {item.authorProfileImage ? (
                                    <img src={item.authorProfileImage} alt={item.authorNickname || ''} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[9px] font-bold text-gray-500 leading-none">
                                        {item.authorNickname ? item.authorNickname[0].toUpperCase() : '?'}
                                    </span>
                                )}
                            </div>
                            <span className="text-[12px] font-medium text-gray-500 truncate">
                                @{item.authorNickname || 'Anonymous'}
                            </span>
                        </div>
                    </div>

                    {/* Registration Date */}
                    <div className="text-[11px] text-gray-400 font-medium">
                        {formatDate(item.createdAt)}
                    </div>

                    {typeof displayedBrickCount === 'number' && displayedBrickCount > 0 && (
                        <div className="text-[11px] text-gray-500 font-bold">
                            {displayedBrickCount.toLocaleString()} {t.kids.bricks}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
