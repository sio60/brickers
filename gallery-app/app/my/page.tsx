'use client';

import { useEffect, useState } from 'react';
import GalleryGrid from '../../components/GalleryGrid';

type GalleryItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    authorNickname: string;
    createdAt: string;
    likeCount: number;
    viewCount: number;
    ldrUrl?: string;
}

type PageResponse<T> = {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    number: number;
}

export default function MyGalleryPage() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMyGallery = async () => {
            try {
                // Get token from localStorage (set by Vite app)
                const token = localStorage.getItem('accessToken');

                if (!token) {
                    setError('로그인이 필요합니다.');
                    setLoading(false);
                    return;
                }

                const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://brickers.shop';

                // Fetch from /api/gallery/my
                // Backend controller: @GetMapping("/my") in GalleryController
                const res = await fetch(`${apiBase}/api/gallery/my?size=100&sort=latest`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    if (res.status === 401) throw new Error('로그인이 만료되었습니다.');
                    throw new Error('데이터를 불러오는데 실패했습니다.');
                }

                const data: PageResponse<GalleryItem> = await res.json();
                setItems(data.content);
            } catch (err: any) {
                console.error(err);
                setError(err.message || '오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchMyGallery();
    }, []);

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center">로딩 중...</div>;

    if (error) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-500 font-bold">{error}</p>
                <a href="/?login=true" className="bg-black text-white px-6 py-2 rounded-lg">로그인하기</a>
            </div>
        );
    }

    return (
        <div className="max-w-[1280px] mx-auto p-5">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-2">My Gallery</h1>
                <p className="text-gray-600">내가 만든 작품들을 모아보세요.</p>
            </header>

            {items.length > 0 ? (
                <div className="mt-8">
                    <GalleryGrid items={items} />
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <p className="mb-4">아직 만든 작품이 없습니다.</p>
                    <a href="https://brickers.shop/kids" className="text-blue-600 hover:underline">작품 만들러 가기 →</a>
                </div>
            )}
        </div>
    );
}
