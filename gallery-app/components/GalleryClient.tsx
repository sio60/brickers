'use client';

import { useState, useEffect } from 'react';
import GalleryPanel from './GalleryPanel';
import GalleryGrid from './GalleryGrid';
import LoadMoreButton from './LoadMoreButton';
import NextButton from './NextButton';
import LoginModal from './LoginModal';
import { GalleryItem } from '../types/gallery';

type Props = {
    initialItems: GalleryItem[];
    initialHasMore: boolean;
};

export default function GalleryClient({ initialItems, initialHasMore }: Props) {
    const [items, setItems] = useState<GalleryItem[]>(initialItems);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
    }, []);

    const loadMore = async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const nextPage = page + 1;
            const res = await fetch(`/api/gallery?page=${nextPage}&size=24&sort=latest`);
            if (res.ok) {
                const data = await res.json();
                setItems(prev => [...prev, ...data.content]);
                setHasMore(!data.last);
                setPage(nextPage);
            }
        } catch (error) {
            console.error('Failed to load more:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookmarkToggle = async (id: string, currentState: boolean) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setShowLoginModal(true);
            return;
        }

        try {
            const res = await fetch(`/api/gallery/${id}/bookmark`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (res.ok) {
                // Update local state
                setItems(prev =>
                    prev.map(item =>
                        item.id === id
                            ? { ...item, isBookmarked: !currentState }
                            : item
                    )
                );
            }
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
        }
    };

    const handleLoginRequired = () => {
        setShowLoginModal(true);
    };

    return (
        <>
            <GalleryPanel
                title="Gallery"
                rightAction={
                    <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black">
                        <option value="latest">최신순</option>
                        <option value="popular">인기순</option>
                    </select>
                }
                footer={
                    <div className="flex items-center gap-6">
                        <LoadMoreButton
                            onClick={loadMore}
                            loading={loading}
                            hasMore={hasMore}
                        />
                        <NextButton
                            href="/kids/main"
                            label="작품 만들기"
                        />
                    </div>
                }
            >
                <GalleryGrid
                    items={items}
                    isLoggedIn={isLoggedIn}
                    onBookmarkToggle={handleBookmarkToggle}
                    onLoginRequired={handleLoginRequired}
                />
            </GalleryPanel>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </>
    );
}
