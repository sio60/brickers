'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import CarouselGallery from "@/components/CarouselGallery";
import AgeSelectionModal from "@/components/kids/AgeSelectionModal";
import { GalleryItem } from "@/types/gallery";
import styles from '@/app/LandingPage.module.css';

// SSR 제외 컴포넌트
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

type Props = {
    initialItems: GalleryItem[];
};

function LandingPageContent({ initialItems }: Props) {
    const router = useRouter();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initialItems);
    const [isLoading, setIsLoading] = useState(initialItems.length === 0);

    // 클라이언트 사이드 fallback: initialItems가 비어있으면 직접 fetch
    useEffect(() => {
        if (initialItems.length === 0) {
            const fetchGallery = async () => {
                try {
                    const res = await fetch('/api/gallery?page=0&size=7&sort=latest');
                    if (res.ok) {
                        const data = await res.json();
                        setGalleryItems(data.content || []);
                    }
                } catch (error) {
                    console.warn('Client-side gallery fetch failed:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchGallery();
        }
    }, [initialItems]);

    const handleGoMake = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }
        setIsAgeModalOpen(true);
    };

    const compressImage = (file: File, maxDim = 2048, quality = 0.8): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleLevelSelect = async (url: string | null, file: File | null, age: string, prompt?: string) => {
        if (prompt) {
            router.push(`/kids/main?age=${age}&prompt=${encodeURIComponent(prompt)}`);
        } else if (file) {
            try {
                const dataUrl = await compressImage(file);
                sessionStorage.setItem('pendingUpload', JSON.stringify({
                    name: file.name,
                    type: file.type,
                    dataUrl
                }));
            } catch {
                console.error('Failed to store upload');
            }
            router.push(`/kids/main?age=${age}`);
        } else if (url) {
            const modelParam = `&model=${encodeURIComponent(url)}`;
            router.push(`/kids/main?age=${age}${modelParam}`);
        }
    };

    return (
        <div className={styles.container}>
            <Background3D entryDirection="top" />

            <div className={styles.gallerySection}>
                <CarouselGallery
                    items={galleryItems}
                    loading={isLoading}
                />
            </div>

            {!isLoading && (
                <div className={styles.hero}>
                    <button
                        className={styles.goMakeBtn}
                        onClick={handleGoMake}
                        type="button"
                    >
                        {t.main.landing.goMake} <span className={styles.arrow}>→</span>
                    </button>
                </div>
            )}

            <AgeSelectionModal
                isOpen={isAgeModalOpen}
                onClose={() => setIsAgeModalOpen(false)}
                onSelect={handleLevelSelect}
            />
        </div>
    );
}

export default function LandingPageClient({ initialItems }: Props) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LandingPageContent initialItems={initialItems} />
        </Suspense>
    );
}
