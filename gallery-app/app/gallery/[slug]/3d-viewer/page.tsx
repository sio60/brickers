'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const Viewer3D = dynamic(() => import('@/components/Viewer3D'), { ssr: false });

function Viewer3DContent() {
    const searchParams = useSearchParams();
    const ldrUrl = searchParams.get('ldrUrl') || '';
    const title = searchParams.get('title') || 'Brickers 3D Viewer';

    if (!ldrUrl) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
                <p className="text-gray-500 font-bold">LDR URL이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex flex-col bg-white">
            {/* Header */}
            <div className="h-14 bg-black text-white flex items-center px-6 shrink-0">
                <h1 className="text-sm font-bold tracking-wider">BRICKERS</h1>
                <span className="mx-3 text-gray-500">|</span>
                <span className="text-sm text-gray-300 truncate">{title}</span>
            </div>

            {/* 3D Viewer */}
            <div className="flex-1 relative">
                <Viewer3D url={ldrUrl} />
            </div>

            {/* Footer */}
            <div className="h-10 bg-gray-100 flex items-center justify-center gap-6 text-xs text-gray-500 font-medium shrink-0">
                <span>드래그: 회전</span>
                <span>스크롤: 줌</span>
            </div>
        </div>
    );
}

export default function ThreeDViewerPage() {
    return (
        <Suspense fallback={
            <div className="w-screen h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <Viewer3DContent />
        </Suspense>
    );
}
