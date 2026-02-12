'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GalleryItem } from '@/types/gallery';
import dynamic from 'next/dynamic';

const Viewer3D = dynamic(() => import('@/components/Viewer3D'), { ssr: false });

type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

const VIEW_ORDER: ViewName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

type ScreenshotGalleryProps = {
    item: GalleryItem;
};

export default function ScreenshotGallery({ item }: ScreenshotGalleryProps) {
    const { t } = useLanguage();
    const [selectedView, setSelectedView] = useState<ViewName>('front');
    const [is3DMode, setIs3DMode] = useState(false);

    return (
        <div className="absolute inset-0 flex flex-col">
            {/* Main content area */}
            <div className="flex-1 relative bg-white">
                {is3DMode && item.ldrUrl ? (
                    /* 3D Viewer - same space as screenshots */
                    <Viewer3D url={item.ldrUrl} />
                ) : (
                    /* Screenshot image */
                    item.screenshotUrls?.[selectedView] ? (
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
                    )
                )}
            </div>

            {/* Bottom bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
                {/* Thumbnails - only show in image mode */}
                {!is3DMode && (
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
                )}

                {/* Toggle button */}
                {item.ldrUrl && (
                    <button
                        onClick={() => setIs3DMode(!is3DMode)}
                        className="w-full py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                    >
                        {is3DMode
                            ? (t.detail?.viewImages || '이미지로 보기')
                            : t.detail.view3d
                        }
                    </button>
                )}
            </div>
        </div>
    );
}
