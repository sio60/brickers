'use client';

import { useState } from 'react';
import Preview3DModal from '@/components/Preview3DModal';

type Props = {
    ldrUrl: string;
};

export default function GalleryDetailActions({ ldrUrl }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!ldrUrl) return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black text-white font-medium text-lg py-3 px-6 rounded-lg hover:opacity-80 transition-opacity"
            >
                3D로 보기 & 만들기
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
