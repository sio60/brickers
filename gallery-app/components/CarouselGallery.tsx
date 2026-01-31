'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './CarouselGallery.module.css';
import Carousel3D from './Carousel3D';

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
    const [showGalleryPrompt, setShowGalleryPrompt] = useState(false);

    // Filter out valid GalleryItems for the 3D carousel
    const validItems = displayItems.filter(item => !('isPlaceholder' in item)) as GalleryItem[];

    const handleGoToGallery = () => {
        router.push('/gallery');
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

            {/* Render 3D Carousel if items exist */}
            {validItems.length > 0 ? (
                <Carousel3D items={validItems} onPreview={onPreview} />
            ) : (
                // Fallback or loading state if needed
                <div className={styles.carouselWrapper}>
                    <div className={styles.carousel}>
                        Loading 3D Gallery...
                    </div>
                </div>
            )}

            {/* "More Works" button separate from carousel since it assumes drag interaction */}
            <div className={styles.indicators}>
                <button
                    className={styles.galleryPromptButton}
                    onClick={() => setShowGalleryPrompt(true)}
                    style={{ marginTop: '20px', fontSize: '14px', padding: '10px 20px' }}
                >
                    + More Works
                </button>
            </div>
        </div>
    );
}
