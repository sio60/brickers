'use client';

import { useState, useEffect } from 'react';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';
import LandingGalleryPreview from './LandingGalleryPreview';
import LandingGalleryThumbnail from './LandingGalleryThumbnail';

interface LandingGalleryProps {
    items?: GalleryItem[];
    loading?: boolean;
}

export default function LandingGallery({ items = [], loading = false }: LandingGalleryProps) {
    const { t } = useLanguage();
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

    useEffect(() => {
        if (items.length > 0 && !selectedItem) {
            setSelectedItem(items[0]);
        }
    }, [items, selectedItem]);

    if (loading) {
        return (
            <div className="w-full max-w-[1200px] mx-auto h-[600px] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-black border-t-yellow-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (!items.length) return null;

    return (
        <div className="w-full max-w-[1200px] mx-auto px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col lg:flex-row gap-10 h-[500px]">
                {/* Left: Big Preview */}
                <div className="flex-[1.2] min-w-0 h-full">
                    {selectedItem && (
                        <LandingGalleryPreview item={selectedItem} />
                    )}
                </div>

                {/* Right: Scrollable List */}
                <div className="flex-1 min-w-0 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xl font-black text-black italic uppercase tracking-tighter">
                            {t.main.landing.recentCreations}
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {items.length} {t.main.landing.itemsCount}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4 pb-6">
                            {items.map((item) => (
                                <LandingGalleryThumbnail
                                    key={item.id}
                                    item={item}
                                    isSelected={selectedItem?.id === item.id}
                                    onClick={setSelectedItem}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Bottom Gradient Fade */}
                    <div className="h-20 -mt-20 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #eee;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #ddd;
                }
            `}</style>
        </div>
    );
}
