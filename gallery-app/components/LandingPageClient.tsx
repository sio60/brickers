'use client';

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import CarouselGallery from "@/components/CarouselGallery";
import AgeSelectionModal from "@/components/kids/AgeSelectionModal";
import Preview3DModal from "@/components/Preview3DModal";
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
    const [selectedLdrUrl, setSelectedLdrUrl] = useState<string | null>(null);

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
        <div className={styles.container}>
            <Background3D entryDirection="top" />

            <div className={styles.gallerySection}>
                <CarouselGallery
                    items={initialItems}
                    loading={false}
                    onPreview={setSelectedLdrUrl}
                />
            </div>

            {!selectedLdrUrl && (
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

            {selectedLdrUrl && (
                <Preview3DModal
                    url={selectedLdrUrl}
                    onClose={() => setSelectedLdrUrl(null)}
                />
            )}
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
