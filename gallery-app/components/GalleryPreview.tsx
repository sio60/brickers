'use client';

import { useRouter } from 'next/navigation';
import { GalleryItem } from '../types/gallery';

type Props = {
    item: GalleryItem;
    isLoggedIn: boolean;
    onLikeToggle?: (id: string, currentState: boolean) => void;
    onBookmarkToggle?: (id: string, currentState: boolean) => void;
    onLoginRequired?: () => void;
};

export default function GalleryPreview({ item, isLoggedIn, onLikeToggle, onBookmarkToggle, onLoginRequired }: Props) {
    const router = useRouter();
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;

    const handleDoubleClick = () => {
        router.push(`/gallery/${slug}`);
    };

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

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Image Container */}
            <div
                className="relative flex-1 bg-white rounded-3xl border-[3px] border-black overflow-hidden cursor-pointer group"
                onDoubleClick={handleDoubleClick}
                title="Double click to view details"
            >
                {displayImageUrl ? (
                    <img
                        src={displayImageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                    </div>
                )}

                {/* Click Hint Overlay */}
                <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <span className="bg-black/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                        Double click for details
                    </span>
                </div>
            </div>

            {/* Info Section */}
            <div className="mt-6 flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-3xl font-black text-black tracking-tighter leading-tight line-clamp-2">
                        {item.title}
                    </h2>
                    {item.authorNickname && (
                        <p className="text-gray-500 font-bold mt-1">@{item.authorNickname}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={handleBookmarkClick}
                        className={`flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-black transition-all ${item.bookmarked
                            ? 'bg-[#ffe135] text-black shadow-[3px_3px_0px_#000]'
                            : 'bg-white text-black hover:bg-gray-50'
                            }`}
                        aria-label={item.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                        <svg
                            className={`w-6 h-6 ${item.bookmarked ? 'fill-black' : 'fill-none'}`}
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

                    <button
                        onClick={handleLikeClick}
                        className={`flex items-center gap-2 h-12 px-6 rounded-2xl border-[3px] border-black transition-all ${item.myReaction === 'LIKE'
                            ? 'bg-[#ffe135] text-black shadow-[3px_3px_0px_#000]'
                            : 'bg-white text-black hover:bg-gray-50'
                            }`}
                        aria-label={item.myReaction === 'LIKE' ? 'Unlike' : 'Like'}
                    >
                        <svg
                            className={`w-6 h-6 ${item.myReaction === 'LIKE' ? 'fill-black' : 'fill-none text-black'}`}
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
                        <span className="text-lg font-black">{item.likeCount || 0}</span>
                    </button>

                    <button
                        onClick={handleDoubleClick}
                        className="h-12 px-6 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors"
                    >
                        See Details
                    </button>
                </div>
            </div>
        </div>
    );
}
