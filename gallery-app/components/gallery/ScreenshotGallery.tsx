'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GalleryItem } from '@/types/gallery';

type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

const VIEW_ORDER: ViewName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

type ScreenshotGalleryProps = {
    item: GalleryItem;
};

export default function ScreenshotGallery({ item }: ScreenshotGalleryProps) {
    const { t } = useLanguage();
    const [selectedView, setSelectedView] = useState<ViewName>('front');

    return (
        <div className="absolute inset-0 flex flex-col">
            {/* Main image - selected view */}
            <div className="flex-1 relative bg-white">
                {item.screenshotUrls?.[selectedView] ? (
                    <Image
                        src={item.screenshotUrls[selectedView]!}
                        alt={selectedView}
                        fill
                        className="object-contain"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No Screenshot
                    </div>
                )}
            </div>

            {/* Thumbnails + 3D viewer button */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex gap-2 justify-center mb-3">
                    {VIEW_ORDER.map(view => (
                        item.screenshotUrls?.[view] ? (
                            <button
                                key={view}
                                onClick={() => setSelectedView(view)}
                                className={`w-14 h-14 relative border-2 rounded-lg overflow-hidden transition-all ${
                                    selectedView === view
                                        ? 'border-black shadow-md'
                                        : 'border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                <Image
                                    src={item.screenshotUrls[view]!}
                                    alt={view}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        ) : null
                    ))}
                </div>

                {item.ldrUrl && (
                    <button
                        onClick={() => {
                            const params = new URLSearchParams({
                                ldrUrl: item.ldrUrl!,
                                title: item.title || 'Brickers 3D',
                            });
                            window.open(`/gallery/${item.id}/3d-viewer?${params.toString()}`, '_blank');
                        }}
                        className="w-full py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                    >
                        {t.detail.view3d}
                    </button>
                )}
            </div>
        </div>
    );
}
