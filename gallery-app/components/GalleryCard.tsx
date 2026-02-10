'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GalleryItem } from '../types/gallery';

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
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;
    const hasValidImage = isValidImageUrl(displayImageUrl);

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
        // 서버/클라이언트 hydration 일치를 위해 고정 포맷 사용
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일`;
    };

    return (
        <Link href={`/gallery/${slug}`} className="block group">
            <div className="gallery-card bg-white rounded-3xl overflow-hidden border-[3px] border-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-300">
                {/* Thumbnail Area */}
                <div className="relative aspect-square bg-white overflow-hidden border-b-[3px] border-black">
                    {hasValidImage ? (
                        <div className="w-full h-full p-4">
                            <img
                                src={displayImageUrl}
                                alt={item.title}
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-4 flex flex-col gap-2">
                    {/* Title */}
                    <h3 className="font-extrabold text-[#000] text-[15px] leading-tight line-clamp-1 group-hover:text-amber-500 transition-colors">
                        {item.title}
                    </h3>

                    {/* Meta info & Action */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden">
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
                            <span className="text-[11px] font-bold text-gray-500 truncate max-w-[80px]">
                                @{item.authorNickname || 'Anonymous'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                            {/* Bookmark button */}
                            {onBookmarkToggle && (
                                <button
                                    onClick={handleBookmarkClick}
                                    className={`flex items-center justify-center w-8 h-8 rounded-xl border-2 border-black transition-all ${item.bookmarked
                                        ? 'bg-[#ffe135] text-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white text-black hover:bg-gray-50'
                                        }`}
                                    aria-label={item.bookmarked ? '북마크 취소' : '북마크 추가'}
                                >
                                    <svg
                                        className={`w-4 h-4 ${item.bookmarked ? 'fill-black' : 'fill-none'}`}
                                        stroke="currentColor"
                                        strokeWidth="2.5"
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

                            {/* Like button */}
                            <button
                                onClick={handleLikeClick}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-black transition-all ${item.myReaction === 'LIKE'
                                    ? 'bg-[#ffe135] text-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-white text-black hover:bg-gray-50'
                                    }`}
                                aria-label={item.myReaction === 'LIKE' ? '좋아요 취소' : '좋아요 추가'}
                            >
                                <svg
                                    className={`w-4 h-4 ${item.myReaction === 'LIKE' ? 'fill-black' : 'fill-none text-black'}`}
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                    />
                                </svg>
                                <span className="text-[11px] font-black leading-none">
                                    {item.likeCount || 0}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
