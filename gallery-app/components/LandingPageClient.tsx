'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import CarouselGallery from "@/components/CarouselGallery";
import AgeSelectionModal from "@/components/kids/AgeSelectionModal";
import { GalleryItem } from "@/types/gallery";
// import styles from '@/app/LandingPage.module.css'; // Removed

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

    const handleLevelSelect = (url: string | null, file: File | null, age: string) => {
        if (file) {
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
        <div className="relative w-full h-[100vh] flex flex-col items-center justify-start z-[1] pt-[100px] md:pt-20">
            <Background3D entryDirection="top" />

            <div className="w-full mt-10 mb-5 z-[5]">
                <CarouselGallery
                    items={galleryItems}
                    loading={isLoading}
                />
            </div>

            {!galleryItems.length && !isLoading ? null : (
                <div className="text-center mt-10 mb-20 z-10">
                    <button
                        className="bg-white text-black border-[3px] border-black rounded-[50px] font-black cursor-pointer flex items-center gap-2 transition-all duration-200 ease-in-out shadow-[0_10px_0px_rgba(0,0,0,0.1)] hover:bg-black hover:text-white hover:translate-y-[2px] hover:shadow-[0_5px_0px_rgba(0,0,0,0.1)] text-[22px] px-8 py-4 md:text-lg md:px-[60px] md:py-2.5"
                        onClick={handleGoMake}
                        type="button"
                    >
                        {t.main.landing.goMake} <span className="text-2xl">→</span>
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
