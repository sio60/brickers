'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './CarouselGallery.module.css';

interface CarouselGalleryProps {
    items?: GalleryItem[];
    onPreview?: (url: string) => void;
}

const MOCK_ITEMS: GalleryItem[] = [
    { id: 'm1', title: 'LEGO BEAR', authorNickname: 'BrickMaster', thumbnailUrl: '/35.png', ldrUrl: '/ldraw/models/3-5_1.ldr' },
    { id: 'm2', title: 'SPACE SHIP', authorNickname: 'SpaceMan', thumbnailUrl: '/3-5_2.png', ldrUrl: '/ldraw/models/3-5_2.ldr' },
    { id: 'm3', title: 'LEGO CAR', authorNickname: 'MechKing', thumbnailUrl: '/67.png', ldrUrl: '/ldraw/models/6-7_1.ldr' },
    { id: 'm4', title: 'CASTLE', authorNickname: 'Knight77', thumbnailUrl: '/6-7_2.png', ldrUrl: '/ldraw/models/6-7_2.ldr' },
    { id: 'm5', title: 'LEGO BLOCKS', authorNickname: 'FlyHigh', thumbnailUrl: '/810.png', ldrUrl: '/ldraw/models/8-10_1.ldr' },
];

export default function CarouselGallery({ items = [], onPreview }: CarouselGalleryProps) {
    const { t } = useLanguage();
    const displayItems = items.length > 0 ? items : MOCK_ITEMS;
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (displayItems.length > 0) {
            setActiveIndex(Math.floor(displayItems.length / 2));
        }
    }, [displayItems.length]);

    const getCardStyle = (index: number) => {
        const offset = index - activeIndex;
        const absOffset = Math.abs(offset);

        // Deep 3D Perspective logic - Extended V-shape Spread
        const x = offset * 380; // EVEN WIDER horizontal spread
        const y = absOffset * -70; // Slightly more fan UPWARDS
        const z = absOffset * -450; // Deeper recession for wider look
        const rotateY = offset * -50; // More aggressive tilt
        const scale = 1 - (absOffset * 0.15);
        const zIndex = 10 - absOffset;
        const opacity = 1 - (absOffset * 0.35);

        return {
            transform: `perspective(1200px) translateX(${x}px) translateY(${y}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
            zIndex,
            opacity: opacity > 0.05 ? opacity : 0.05,
            pointerEvents: 'auto', // Allow interaction
        } as React.CSSProperties;
    };

    const handlePrev = () => {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    };

    const handleNext = () => {
        setActiveIndex(prev => (prev < displayItems.length - 1 ? prev + 1 : prev));
    };

    const handleCardClick = (index: number, ldrUrl?: string) => {
        if (index === activeIndex && ldrUrl) {
            onPreview?.(ldrUrl);
        } else {
            setActiveIndex(index);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.carouselWrapper}>
                <button
                    className={`${styles.navButton} ${styles.prev}`}
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    aria-label="Previous"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                <div className={styles.carousel}>
                    {displayItems.map((item, index) => (
                        <div
                            key={item.id}
                            className={`${styles.card} ${index === activeIndex ? styles.active : ''}`}
                            style={getCardStyle(index)}
                            onClick={() => handleCardClick(index, item.ldrUrl)}
                        >
                            <div className={styles.preview}>
                                {item.thumbnailUrl && (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                )}
                            </div>
                            <div className={styles.info}>
                                <div className={styles.metaRow}>
                                    <span className={styles.label}>{t.main.landing.titleLabel} </span>
                                    <span className={styles.value}>{item.title}</span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span className={styles.label}>{t.main.landing.authorLabel} </span>
                                    <span className={styles.value}>{item.authorNickname || 'Anonymous'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className={`${styles.navButton} ${styles.next}`}
                    onClick={handleNext}
                    disabled={activeIndex === displayItems.length - 1}
                    aria-label="Next"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>

            <div className={styles.indicators}>
                {displayItems.map((_, index) => (
                    <button
                        key={index}
                        className={`${styles.indicator} ${index === activeIndex ? styles.activeIndicator : ''}`}
                        onClick={() => setActiveIndex(index)}
                    />
                ))}
            </div>
        </div>
    );
}
