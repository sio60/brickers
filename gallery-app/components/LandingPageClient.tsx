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

    const handleLevelSelect = (url: string | null, file: File | null, age: string, prompt?: string) => {
        if (prompt) {
            sessionStorage.setItem('pendingPrompt', prompt);
            router.push(`/kids/main?age=${age}`);
        } else if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                sessionStorage.setItem('pendingUpload', JSON.stringify({
                    name: file.name,
                    type: file.type,
                    dataUrl
                }));
                router.push(`/kids/main?age=${age}`);
            };
            reader.readAsDataURL(file);
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

            {!galleryItems.length && !isLoading ? null : (
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
