'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GalleryItem } from '../types/gallery';

export type { GalleryItem };

type Props = {
    item: GalleryItem;
    isLoggedIn: boolean;
    onLikeToggle?: (id: string, currentState: boolean) => void;
    onLoginRequired?: () => void;
};

// Check if URL is valid (starts with http/https or is a valid S3 URL)
function isValidImageUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

export default function GalleryCard({ item, isLoggedIn, onLikeToggle, onLoginRequired }: Props) {
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const hasValidImage = isValidImageUrl(item.thumbnailUrl);

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
            <div className="gallery-card bg-white rounded-3xl overflow-hidden border-2 border-black hover:shadow-xl transition-all duration-300">
                {/* Thumbnail Area */}
                <div className="relative aspect-square bg-[#f9f9f9] overflow-hidden border-b border-gray-100">
                    {hasValidImage ? (
                        <div className="w-full h-full p-2.5">
                            <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
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
                    <h3 className="font-black text-[#000] text-[14px] leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {item.title}
                    </h3>

                    {/* Meta info & Action */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-400 overflow-hidden whitespace-nowrap">
                            {item.authorNickname && (
                                <span className="truncate max-w-[80px] text-gray-700">{item.authorNickname}</span>
                            )}
                            {item.authorNickname && item.createdAt && (
                                <span className="text-gray-200">|</span>
                            )}
                            {item.createdAt && (
                                <span className="shrink-0">{formatDate(item.createdAt)}</span>
                            )}
                        </div>

                        {/* Bookmark/Like button */}
                        <button
                            onClick={handleLikeClick}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-black transition-all ${item.myReaction === 'LIKE'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-50'
                                }`}
                            aria-label={item.myReaction === 'LIKE' ? '좋아요 취소' : '좋아요 추가'}
                        >
                            <svg
                                className={`w-3.5 h-3.5 ${item.myReaction === 'LIKE' ? 'fill-white' : 'fill-none text-gray-400'}`}
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14 9l-1.154-4.832A2.212 2.212 0 0010.697 2.5a2.212 2.212 0 00-2.149 2.149v4.351H5.432a2.33 2.33 0 00-2.332 2.332c0 .942.553 1.758 1.354 2.138-.113.385-.175.792-.175 1.213 0 .762.2 1.478.553 2.1-.2.433-.314.914-.314 1.424 0 .866.326 1.656.862 2.253.536.597 1.272.96 2.088.96h7.5c2.209 0 4-1.791 4-4v-5c0-1.105-.895-2-2-2h-3z"
                                />
                            </svg>
                            <span className="text-[10px] font-black leading-none">
                                {item.likeCount || 0}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
