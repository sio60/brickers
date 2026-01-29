'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GalleryItem } from '../types/gallery';

export type { GalleryItem };

type Props = {
    item: GalleryItem;
    isLoggedIn: boolean;
    onBookmarkToggle?: (id: string, currentState: boolean) => void;
    onLoginRequired?: () => void;
};

// Check if URL is valid (starts with http/https or is a valid S3 URL)
function isValidImageUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

export default function GalleryCard({ item, isLoggedIn, onBookmarkToggle, onLoginRequired }: Props) {
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const hasValidImage = isValidImageUrl(item.thumbnailUrl);

    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            onLoginRequired?.();
            return;
        }

        onBookmarkToggle?.(item.id, item.isBookmarked || false);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    };

    return (
        <Link href={`/gallery/${slug}`} className="block">
            <div className="gallery-card bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Thumbnail */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {hasValidImage ? (
                        <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                            </svg>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Title */}
                    <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1">
                        {item.title}
                    </h3>

                    {/* Meta info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            {item.authorNickname && (
                                <span>{item.authorNickname}</span>
                            )}
                            {item.authorNickname && item.createdAt && (
                                <span className="text-gray-300">·</span>
                            )}
                            {item.createdAt && (
                                <span>{formatDate(item.createdAt)}</span>
                            )}
                            {item.brickCount && (
                                <>
                                    <span className="text-gray-300">·</span>
                                    <span>{item.brickCount} bricks</span>
                                </>
                            )}
                        </div>

                        {/* Bookmark/Like button */}
                        <button
                            onClick={handleBookmarkClick}
                            className="flex items-center gap-1 text-sm transition-colors"
                            aria-label={item.isBookmarked ? '북마크 해제' : '북마크 추가'}
                        >
                            <svg
                                className={`w-5 h-5 transition-colors ${
                                    item.isBookmarked
                                        ? 'fill-red-500 text-red-500'
                                        : 'fill-none text-gray-400 hover:text-red-400'
                                }`}
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                            </svg>
                            <span className={item.isBookmarked ? 'text-red-500' : 'text-gray-400'}>
                                {item.likeCount || 0}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
