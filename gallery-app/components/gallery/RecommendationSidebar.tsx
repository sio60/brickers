'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GalleryItem } from '@/types/gallery';

type RecommendationSidebarProps = {
    recommendations: GalleryItem[];
    t: {
        main: {
            galleryList: {
                allCreations: string;
            };
        };
        kids: {
            bricks: string;
        };
    };
};

export default function RecommendationSidebar({ recommendations, t }: RecommendationSidebarProps) {
    const router = useRouter();

    return (
        <div className="w-[260px] bg-white border-l border-gray-200 flex flex-col shrink-0 relative z-10 rounded-r-3xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 tracking-tight italic uppercase">
                    {t.main.galleryList.allCreations}
                </h3>
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {recommendations.length > 0 ? (
                    recommendations.map((rec) => {
                        const safeTitle = rec.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                        const recSlug = `${safeTitle}-${rec.id}`;
                        const displayedBrickCount = rec.parts ?? rec.brickCount;
                        return (
                            <button
                                key={rec.id}
                                onClick={() => router.push(`/gallery/${recSlug}`)}
                                className="group text-left flex flex-col gap-2 p-2 rounded-2xl bg-white transition-all border-2 border-black hover:shadow-[4px_4px_0px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
                            >
                                <div className="relative aspect-square w-full bg-[#f9f9f9] rounded-xl overflow-hidden border border-gray-100">
                                    {(rec.sourceImageUrl || rec.thumbnailUrl) ? (
                                        <Image
                                            src={rec.sourceImageUrl || rec.thumbnailUrl}
                                            alt={rec.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase">No Img</div>
                                    )}
                                </div>
                                <div className="px-1">
                                    <h4 className="text-[11px] font-black text-gray-900 line-clamp-1 mb-0.5 tracking-tight group-hover:text-yellow-600 transition-colors">
                                        {rec.title}
                                    </h4>
                                    <p className="text-[9px] font-bold text-gray-400">@{rec.authorNickname || 'Anonymous'}</p>
                                    {typeof displayedBrickCount === 'number' && displayedBrickCount > 0 && (
                                        <p className="text-[9px] font-bold text-gray-500 mt-0.5">
                                            {displayedBrickCount.toLocaleString()} {t.kids.bricks}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-20 grayscale">
                        <div className="text-4xl mb-2">📦</div>
                        <div className="text-[10px] font-black uppercase tracking-widest">Loading...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
