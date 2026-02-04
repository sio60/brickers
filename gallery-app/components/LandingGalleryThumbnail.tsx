'use client';

import { GalleryItem } from '../types/gallery';

type Props = {
    item: GalleryItem;
    isSelected: boolean;
    onClick: (item: GalleryItem) => void;
};

export default function LandingGalleryThumbnail({ item, isSelected, onClick }: Props) {
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;

    return (
        <button
            onClick={() => onClick(item)}
            className={`relative flex flex-col bg-white rounded-3xl border-[3px] transition-all duration-300 group overflow-hidden aspect-[4/5] ${isSelected
                ? 'border-yellow-400 scale-[0.98] shadow-lg'
                : 'border-black hover:scale-[1.02] hover:shadow-xl'
                }`}
        >
            <div className="aspect-[4/3] w-full p-3 flex items-center justify-center bg-[#fcfcfc] border-b-[2px] border-black/5">
                {displayImageUrl ? (
                    <div className="relative w-full h-full">
                        <img
                            src={displayImageUrl}
                            alt={item.title}
                            className={`w-full h-full object-contain transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col justify-center px-3 py-3 gap-1 overflow-hidden bg-white">
                <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tighter text-center">
                    {item.title}
                </p>
                <p className="text-[9px] font-bold text-gray-400 truncate text-center">
                    @{item.authorNickname || 'Anonymous'}
                </p>
            </div>

            {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </button>
    );
}
