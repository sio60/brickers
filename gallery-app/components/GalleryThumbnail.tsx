'use client';

import { GalleryItem } from '../types/gallery';

type Props = {
    item: GalleryItem;
    isSelected: boolean;
    onClick: (item: GalleryItem) => void;
};

export default function GalleryThumbnail({ item, isSelected, onClick }: Props) {
    const displayImageUrl = item.sourceImageUrl || item.thumbnailUrl;

    return (
        <button
            onClick={() => onClick(item)}
            className={`relative aspect-square w-full rounded-2xl overflow-hidden border-[3px] transition-all duration-300 group ${isSelected
                ? 'border-[#ffe135] scale-[0.98] shadow-inner shadow-[#ffe135]/20'
                : 'border-black hover:scale-[1.02] hover:shadow-lg'
                }`}
        >
            <div className={`w-full h-full p-2 bg-white flex items-center justify-center transition-colors duration-300 ${isSelected ? 'bg-amber-50/50' : ''}`}>
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

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#ffe135] border-2 border-black rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Hover Title */}
            {!isSelected && (
                <div className="absolute inset-0 bg-black/60 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-[10px] font-black leading-tight uppercase line-clamp-2">
                        {item.title}
                    </p>
                </div>
            )}
        </button>
    );
}
