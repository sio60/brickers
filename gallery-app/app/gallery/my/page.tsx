'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GalleryPanel from '@/components/GalleryPanel';
import GalleryGrid from '@/components/GalleryGrid';
import Tabs from '@/components/Tabs';
import LoadMoreButton from '@/components/LoadMoreButton';
import NextButton from '@/components/NextButton';
import { GalleryItem, PageResponse } from '@/types/gallery';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyGalleryPage() {
    const { t } = useLanguage();

    const TABS = [
        { id: 'my', label: t.my.tabMy },
        { id: 'bookmarks', label: t.my.tabBookmarks },
    ];

    const router = useRouter();
    const [activeTab, setActiveTab] = useState('my');
    const [myItems, setMyItems] = useState<GalleryItem[]>([]);
    const [bookmarkItems, setBookmarkItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [myPage, setMyPage] = useState(0);
    const [bookmarkPage, setBookmarkPage] = useState(0);
    const [myHasMore, setMyHasMore] = useState(true);
    const [bookmarkHasMore, setBookmarkHasMore] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                window.location.href = '/?login=true';
                return;
            }
            fetchMyGallery(token, 0);
            fetchBookmarks(token, 0);
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    const fetchMyGallery = async (token: string, pageNum: number) => {
        try {
            if (pageNum === 0) setLoading(true);
            else setLoadingMore(true);

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/gallery/my?page=${pageNum}&size=12`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('accessToken');
                window.location.href = '/?login=true';
                return;
            }

            if (res.ok) {
                const data: PageResponse<GalleryItem> = await res.json();
                if (pageNum === 0) {
                    setMyItems(data.content);
                } else {
                    setMyItems(prev => [...prev, ...data.content]);
                }
                setMyHasMore(!data.last);
                setMyPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch my gallery:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchBookmarks = async (token: string, pageNum: number) => {
        try {
            if (pageNum === 0) setLoading(true);
            else setLoadingMore(true);

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/gallery/bookmarks/my?page=${pageNum}&size=12`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Map bookmark response to GalleryItem format
                const items: GalleryItem[] = data.content.map((b: any) => ({
                    id: b.postId,
                    title: b.title,
                    thumbnailUrl: b.thumbnailUrl,
                    createdAt: b.postCreatedAt,
                    isBookmarked: true,
                }));

                if (pageNum === 0) {
                    setBookmarkItems(items);
                } else {
                    setBookmarkItems(prev => [...prev, ...items]);
                }
                setBookmarkHasMore(!data.last);
                setBookmarkPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch bookmarks:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        if (activeTab === 'my') {
            fetchMyGallery(token, myPage + 1);
        } else {
            fetchBookmarks(token, bookmarkPage + 1);
        }
    };

    const handleBookmarkToggle = async (id: string, currentState: boolean) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const res = await fetch(`/api/gallery/${id}/bookmark`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (res.ok) {
                // Update my items
                setMyItems(prev =>
                    prev.map(item =>
                        item.id === id ? { ...item, isBookmarked: !currentState } : item
                    )
                );

                // Update bookmark items (remove if unbookmarked)
                if (currentState) {
                    setBookmarkItems(prev => prev.filter(item => item.id !== id));
                }
            }
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
        }
    };

    const currentItems = activeTab === 'my' ? myItems : bookmarkItems;
    const hasMore = activeTab === 'my' ? myHasMore : bookmarkHasMore;

    if (loading && myItems.length === 0 && bookmarkItems.length === 0) {
        return (
            <div className="relative z-10 px-4 py-6">
                <GalleryPanel title="내 갤러리">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
                    </div>
                </GalleryPanel>
            </div>
        );
    }

    return (
        <div className="relative z-10 px-4 py-6">
            <GalleryPanel
                title={t.my.title}
                rightAction={
                    <Tabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
                footer={
                    <div className="flex items-center gap-6">
                        <LoadMoreButton
                            onClick={handleLoadMore}
                            loading={loadingMore}
                            hasMore={hasMore}
                        />
                        {hasMore && (
                            <NextButton
                                onClick={handleLoadMore}
                                label={t.my.next}
                            />
                        )}
                    </div>
                }
            >
                <GalleryGrid
                    items={currentItems}
                    isLoggedIn={true}
                    onBookmarkToggle={handleBookmarkToggle}
                />
            </GalleryPanel>
        </div>
    );
}
