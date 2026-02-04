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
            className={`relative flex flex-col bg-white rounded-3xl border-[3px] transition-all duration-300 group overflow-hidden ${isSelected
                ? 'border-yellow-400 scale-[0.98] shadow-lg'
                : 'border-black hover:scale-[1.02] hover:shadow-xl'
                }`}
        >
            <div className="aspect-square w-full p-4 flex items-center justify-center bg-white">
                {displayImageUrl ? (
                    <img
                        src={displayImageUrl}
                        alt={item.title}
                        className={`w-full h-full object-contain transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="px-4 pb-4">
                <p className="text-[11px] font-black text-black truncate uppercase tracking-tighter">
                    {item.title}
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
