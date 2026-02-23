'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Preview3DModal from '@/components/three/Preview3DModal';

type Props = {
    ldrUrl: string;
};

export default function GalleryDetailActions({ ldrUrl }: Props) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!ldrUrl) return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black text-white font-medium text-lg py-3 px-6 rounded-lg hover:opacity-80 transition-opacity"
            >
                {t.detail.view3d}
            </button>

            {isModalOpen && (
                <Preview3DModal
                    url={ldrUrl}
                    onClose={() => setIsModalOpen(false)}
                    buildUrl={`/kids/steps?url=${encodeURIComponent(ldrUrl)}&isPreset=true`}
                />
            )}
        </>
    );
}
