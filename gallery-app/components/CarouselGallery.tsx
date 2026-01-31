'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './CarouselGallery.module.css';

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
    onPreview?: (url: string) => void;
}

const PLACEHOLDER_ITEMS: PlaceholderItem[] = Array(5).fill(null).map((_, i) => ({
    id: `placeholder-${i}`,
    title: '',
    authorNickname: '',
    thumbnailUrl: '',
    isPlaceholder: true as const,
}));

export default function CarouselGallery({ items = [], loading = false, onPreview }: CarouselGalleryProps) {
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
        const isBack = Math.abs(normalizedAngle) > 90;

        return {
            transform: `translateZ(-500px) rotateY(${angle}deg) translateZ(${radius}px)`,
            // translateZ(-500px) moves the whole pivot back so the front card is near z=0 (screen plane)
            // Then rotateY distributes them in a circle
            // Then translateZ(radius) pushes them out to the cylinder surface

            opacity: Math.abs(normalizedAngle) > 100 ? 0 : 1, // Hide cards that are completely behind
            zIndex: 100 - Math.abs(Math.round(normalizedAngle)), // Simple z-sorting
            pointerEvents: Math.abs(normalizedAngle) < 20 ? 'auto' : 'none', // Allow clicks mostly on front cards
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
        if (index === activeIndex && 'ldrUrl' in item && item.ldrUrl) {
            onPreview?.(item.ldrUrl);
        } else {
            setActiveIndex(index);
        }
    };

    return (
        <div className={styles.container}>
            {/* Gallery Prompt Overlay */}
            {showGalleryPrompt && (
                <div className={styles.galleryPromptOverlay} onClick={() => setShowGalleryPrompt(false)}>
                    <div className={styles.galleryPromptContent} onClick={e => e.stopPropagation()}>
                        <p className={styles.galleryPromptText}>
                            {t.main.landing.moreWorks || '더 많은 작품이 궁금하신가요?'}
                        </p>
                        <button className={styles.galleryPromptButton} onClick={handleGoToGallery}>
                            {t.main.landing.goToGallery || '갤러리 보러가기'} →
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.carouselWrapper}>
                <button
                    className={`${styles.navButton} ${styles.prev}`}
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    aria-label="Previous"
                >
                    &lt;
                </button>


                <div className={styles.carousel}>
                    {displayItems.map((item, index) => {
                        const isPlaceholder = 'isPlaceholder' in item && item.isPlaceholder;
                        return (
                            <div
                                key={item.id}
                                className={`${styles.card} ${index === activeIndex ? styles.active : ''} ${isPlaceholder ? styles.placeholderCard : ''}`}
                                style={getCardStyle(index)}
                                onClick={() => handleCardClick(index, item)}
                            >
                                <div className={styles.preview}>
                                    {isPlaceholder ? (
                                        <div className={styles.placeholder}>
                                            <svg className={styles.placeholderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                            </svg>
                                        </div>
                                    ) : item.thumbnailUrl ? (
                                        <Image
                                            src={item.thumbnailUrl}
                                            alt={item.title}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                        />
                                    ) : null}
                                </div>
                                <div className={styles.info}>
                                    {isPlaceholder ? (
                                        <>
                                            <div className={styles.placeholderText} style={{ width: '70%' }} />
                                            <div className={styles.placeholderText} style={{ width: '50%' }} />
                                        </>
                                    ) : (
                                        <>
                                            <div className={styles.metaRow}>
                                                <span className={styles.label}>{t.main.landing.titleLabel} </span>
                                                <span className={styles.value}>{item.title}</span>
                                            </div>
                                            <div className={styles.metaRow}>
                                                <span className={styles.label}>{t.main.landing.authorLabel} </span>
                                                <span className={styles.value}>{item.authorNickname || 'Anonymous'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    className={`${styles.navButton} ${styles.next}`}
                    onClick={handleNext}
                    disabled={activeIndex === displayItems.length - 1}
                    aria-label="Next"
                >
                    &gt;
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
        </div >
    );
}
