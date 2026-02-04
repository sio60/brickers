'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlaceholderItem {
    id: string;
    title: string;
    authorNickname: string;
    thumbnailUrl: string;
    isPlaceholder: true;
}

type DisplayItem = GalleryItem | PlaceholderItem;

interface CarouselGalleryProps {
    items?: GalleryItem[];
    loading?: boolean;
}

const PLACEHOLDER_ITEMS: PlaceholderItem[] = Array(5).fill(null).map((_, i) => ({
    id: `placeholder-${i}`,
    title: '',
    authorNickname: '',
    thumbnailUrl: '',
    isPlaceholder: true as const,
}));

export default function CarouselGallery({ items = [], loading = false }: CarouselGalleryProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const displayItems: DisplayItem[] = loading ? PLACEHOLDER_ITEMS : items;
    const [activeIndex, setActiveIndex] = useState(0);
    const [showGalleryPrompt, setShowGalleryPrompt] = useState(false);

    useEffect(() => {
        if (displayItems.length > 0) {
            setActiveIndex(Math.floor(displayItems.length / 2));
        }
    }, [displayItems.length]);

    // Reset prompt when index changes
    useEffect(() => {
        setShowGalleryPrompt(false);
    }, [activeIndex]);

    const getCardStyle = (index: number) => {
        const offset = index - activeIndex;
        // 3D Cylinder Layout
        const theta = 40; // Angle between cards (degrees)
        const radius = 550; // Radius of the cylinder
        const angle = offset * theta;

        // Calculate opacity/visibility based on rotation to hide back-facing cards nicely
        // Normalize angle to -180 ~ 180 to determine "back" side
        const normalizedAngle = ((angle % 360) + 540) % 360 - 180;

        return {
            transform: `translateZ(-500px) rotateY(${angle}deg) translateZ(${radius}px)`,
            // translateZ(-500px) moves the whole pivot back so the front card is near z=0
            // Then rotateY distributes them in a circle
            // Then translateZ(radius) pushes them out to the cylinder surface

            opacity: Math.abs(normalizedAngle) > 100 ? 0 : 1, // Hide cards that are completely behind
            zIndex: 100 - Math.abs(Math.round(normalizedAngle)), // Simple z-sorting
            pointerEvents: Math.abs(normalizedAngle) < 90 ? 'auto' : 'none', // Allow clicks on all visible cards
            transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        } as React.CSSProperties;
    };

    const handlePrev = () => {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        setShowGalleryPrompt(false);
    };

    const handleNext = () => {
        if (activeIndex === displayItems.length - 1) {
            // Already at last item, show gallery prompt
            setShowGalleryPrompt(true);
        } else {
            setActiveIndex(prev => prev + 1);
        }
    };

    const handleGoToGallery = () => {
        router.push('/gallery');
    };

    const handleCardClick = (index: number, item: DisplayItem) => {
        // placeholder 카드는 클릭 무시
        if ('isPlaceholder' in item && item.isPlaceholder) {
            return;
        }

        // 중앙 카드가 아니면 해당 카드로 이동만 시킴 (선택 사항: 이동 후 클릭 시 상세 페이지로?)
        // 유저의 요청은 "클릭 가능하게 해줘" 이므로 바로 상세 페이지로 보내겠습니다.
        if (index !== activeIndex) {
            setActiveIndex(index);
        }

        // Navigate to Gallery Detail page with slug
        const galleryItem = item as GalleryItem;
        const safeTitle = galleryItem.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
        const slug = `${safeTitle}-${galleryItem.id}`;
        router.push(`/gallery/${slug}`);
    };

    return (
        <div className="w-full h-[550px] flex flex-col items-center justify-center overflow-hidden relative pt-5">
            {/* Gallery Prompt Overlay */}
            {showGalleryPrompt && (
                <div
                    className="absolute inset-0 bg-white/95 flex items-center justify-center z-[200] animate-fadeIn"
                    onClick={() => setShowGalleryPrompt(false)}
                >
                    <div
                        className="flex flex-col items-center gap-6 p-10 animate-slideUp"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-2xl font-bold text-black text-center">
                            {t.main.landing.moreWorks || '더 많은 작품이 궁금하신가요?'}
                        </p>
                        <button
                            className="px-8 py-4 text-lg font-black text-white bg-black border-[3px] border-black rounded-2xl cursor-pointer transition-all duration-200 shadow-[0_6px_0px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0px_rgba(0,0,0,0.3)]"
                            onClick={handleGoToGallery}
                        >
                            {t.main.landing.goToGallery || '갤러리 보러가기'} →
                        </button>
                    </div>
                </div>
            )}

            {/* Cards Container - Centered */}
            <div className="w-full max-w-[1200px] h-[450px] relative flex items-center justify-center perspective-[2000px] preserve-3d pointer-events-auto z-20">
                {displayItems.map((item, index) => {
                    const isPlaceholder = 'isPlaceholder' in item && item.isPlaceholder;
                    return (
                        <div
                            key={item.id}
                            className={`absolute w-[260px] h-[360px] bg-white rounded-[20px] border-2 border-black shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_28px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden transition-all duration-400 cursor-pointer select-none preserve-3d md:w-[220px] md:h-[320px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.1),0_16px_36px_rgba(0,0,0,0.14)] ${index === activeIndex ? 'shadow-[0_8px_24px_rgba(0,0,0,0.12),0_24px_48px_rgba(0,0,0,0.16)]' : ''} ${isPlaceholder ? 'cursor-default' : ''}`}
                            style={getCardStyle(index)}
                            onClick={() => handleCardClick(index, item)}
                        >
                            <div className="flex-1 flex items-center justify-center p-4 border-b-2 border-black relative bg-gradient-to-b from-[#fafafa] to-[#f0f0f0]">
                                {isPlaceholder ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] animate-pulse">
                                        <svg className="w-[60px] h-[60px] text-[#ccc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                        </svg>
                                    </div>
                                ) : (!isPlaceholder && ((item as GalleryItem).sourceImageUrl || (item as GalleryItem).thumbnailUrl)) ? (
                                    <Image
                                        src={(item as GalleryItem).sourceImageUrl || (item as GalleryItem).thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : null}
                            </div>
                            <div className="p-4 bg-white flex flex-col gap-1.5">
                                {isPlaceholder ? (
                                    <>
                                        <div className="h-4 bg-gradient-to-r from-[#e0e0e0] via-[#f0f0f0] to-[#e0e0e0] bg-[length:200%_100%] animate-shimmer rounded w-[70%]" />
                                        <div className="h-4 bg-gradient-to-r from-[#e0e0e0] via-[#f0f0f0] to-[#e0e0e0] bg-[length:200%_100%] animate-shimmer rounded w-[50%]" />
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-0.5 text-left">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider shrink-0">{t.main.landing.titleLabel}</span>
                                            </div>
                                            <span className="text-[13px] font-bold text-[#222] truncate w-full block">{item.title}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 text-left mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider shrink-0">{t.main.landing.authorLabel}</span>
                                            </div>
                                            <span className="text-[13px] font-medium text-[#444] truncate w-full block">{item.authorNickname || 'Anonymous'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Controls & Pagination */}
            <div className="flex items-center gap-8 mt-10 z-50 pointer-events-auto">
                <button
                    className="bg-transparent border-none flex items-center justify-center cursor-pointer transition-all duration-200 text-black text-[40px] font-[100] leading-none font-sans hover:scale-110 hover:text-[#333] active:scale-95 disabled:opacity-10 disabled:cursor-default"
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    aria-label="Previous"
                >
                    &lt;
                </button>

                <div className="flex gap-3">
                    {displayItems.map((_, index) => (
                        <button
                            key={index}
                            className={`w-3 h-3 rounded-full border-none cursor-pointer transition-all duration-300 ${index === activeIndex ? 'w-8 bg-black' : 'bg-[#ddd]'}`}
                            onClick={() => setActiveIndex(index)}
                        />
                    ))}
                </div>

                <button
                    className="bg-transparent border-none flex items-center justify-center cursor-pointer transition-all duration-200 text-black text-[40px] font-[100] leading-none font-sans hover:scale-110 hover:text-[#333] active:scale-95 disabled:opacity-10 disabled:cursor-default"
                    onClick={handleNext}
                    disabled={activeIndex === displayItems.length - 1}
                    aria-label="Next"
                >
                    &gt;
                </button>
            </div>

            <style jsx>{`
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .perspective-[2000px] {
                    perspective: 2000px;
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease;
                }
            `}</style>
        </div>
    );
}
