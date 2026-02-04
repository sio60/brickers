'use client';

import { useRouter } from 'next/navigation';
import { GalleryItem } from '../types/gallery';

type Props = {
    item: GalleryItem;
};

export default function LandingGalleryPreview({ item }: Props) {
    const router = useRouter();
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const slug = `${safeTitle}-${item.id}`;
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;

    const handleDoubleClick = () => {
        router.push(`/gallery/${slug}`);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-700">
            <div
                className="relative flex-1 bg-white rounded-[40px] border-[4px] border-black overflow-hidden cursor-pointer group shadow-2xl"
                onDoubleClick={handleDoubleClick}
            >
                {displayImageUrl ? (
                    <img
                        src={displayImageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain p-12 transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                    </div>
                )}

                {/* Info Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm border-t-[4px] border-black p-8 transition-transform duration-500 translate-y-[2px] group-hover:translate-y-0">
                    <h2 className="text-3xl font-black text-black tracking-tighter leading-tight italic">
                        {item.title}
                    </h2>
                    <p className="text-gray-500 font-bold mt-1 text-lg">@{item.authorNickname || 'Anonymous'}</p>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Double click for details</span>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full">
                                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                </svg>
                                <span className="text-xs font-black">{item.likeCount || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
