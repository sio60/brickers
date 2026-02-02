'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GalleryPanel from './GalleryPanel';
import GalleryGrid from './GalleryGrid';
import Pagination from './Pagination';
import { GalleryItem } from '../types/gallery';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Props = {
    initialItems: GalleryItem[];
    initialHasMore: boolean;
    initialTotalPages: number;
    initialTotalElements: number;
};

export default function GalleryClient({ initialItems, initialHasMore, initialTotalPages, initialTotalElements }: Props) {
    const { t } = useLanguage();
    const { isAuthenticated, authFetch } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<GalleryItem[]>(initialItems);
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('latest');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [totalElements, setTotalElements] = useState(initialTotalElements);
    const [loading, setLoading] = useState(false);

    const goToPage = async (targetPage: number) => {
        if (loading || targetPage < 0 || targetPage >= totalPages) return;

        setLoading(true);
        try {
            const endpoint = category === 'bookmarks' ? '/api/gallery/bookmarks/my' : '/api/gallery';

            // Use authFetch if it's the bookmarks endpoint (which requires auth)
            // Otherwise use regular fetch
            const fetcher = category === 'bookmarks' ? authFetch : fetch;

            const res = await fetcher(`${endpoint}?page=${targetPage}&size=24&sort=${sort}`);
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []).map((item: any) => ({
                    ...item,
                    myReaction: item.myReaction
                }));
                setItems(content);
                setPage(targetPage);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Failed to load page:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = async (newCategory: string) => {
        if (newCategory === category) return;
        if (newCategory === 'bookmarks' && !isAuthenticated) {
            router.push('?login=true');
            return;
        }

        setCategory(newCategory);
        setLoading(true);
        setPage(0);

        try {
            const endpoint = newCategory === 'bookmarks' ? '/api/gallery/bookmarks/my' : '/api/gallery';
            const fetcher = newCategory === 'bookmarks' ? authFetch : fetch; // Use authFetch for bookmarks

            const res = await fetcher(`${endpoint}?page=0&size=24&sort=${sort}`);
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []).map((item: any) => ({
                    ...item,
                    myReaction: item.myReaction
                }));
                setItems(content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
                // If endpoint not found or error, fallback to local filter if it's bookmarks
                if (newCategory === 'bookmarks') {
                    const bookmarkedOnly = initialItems.filter(i => i.bookmarked);
                    setItems(bookmarkedOnly);
                    setTotalPages(1);
                    setTotalElements(bookmarkedOnly.length);
                } else {
                    setItems(initialItems);
                    setTotalPages(initialTotalPages);
                    setTotalElements(initialTotalElements);
                }
            }
        } catch (error) {
            console.error('Category change failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSortChange = async (newSort: string) => {
        if (newSort === sort) return;

        setSort(newSort);
        setLoading(true);
        setPage(0);

        try {
            const endpoint = category === 'bookmarks' ? '/api/gallery/bookmarks/my' : '/api/gallery';
            const fetcher = category === 'bookmarks' ? authFetch : fetch; // Use authFetch for bookmarks
            const res = await fetcher(`${endpoint}?page=0&size=24&sort=${newSort}`);
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []).map((item: any) => ({
                    ...item,
                    myReaction: item.myReaction
                }));
                setItems(content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            }
        } catch (error) {
            console.error('Sort change failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLikeToggle = async (id: string, currentState: boolean) => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        try {
            const res = await authFetch(`/api/gallery/${id}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'LIKE' }),
            });

            if (res.ok) {
                const data = await res.json();
                setItems(prev =>
                    prev.map(item =>
                        item.id === id
                            ? {
                                ...item,
                                myReaction: data.myReaction === 'LIKE' ? 'LIKE' : null,
                                likeCount: data.likeCount !== undefined ? data.likeCount : (data.myReaction === 'LIKE' ? (item.likeCount || 0) + 1 : (item.likeCount || 0) - 1)
                            }
                            : item
                    )
                );
            }
        } catch (error) {
            console.error('Like toggle failed:', error);
        }
    };

    const handleBookmarkToggle = async (id: string, currentState: boolean) => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        try {
            const res = await authFetch(`/api/gallery/${id}/bookmark`, {
                method: 'POST',
            });

            if (res.ok) {
                const data = await res.json();

                // If we are in the 'bookmarks' category and unbookmarking, remove from list
                if (category === 'bookmarks' && !data.bookmarked) {
                    setItems(prev => prev.filter(item => item.id !== id));
                    setTotalElements(prev => prev - 1);
                } else {
                    setItems(prev =>
                        prev.map(item =>
                            item.id === id
                                ? { ...item, bookmarked: data.bookmarked }
                                : item
                        )
                    );
                }
            }
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
        }
    };

    const handleLoginRequired = () => {
        router.push('?login=true');
    };

    const showPagination = totalElements > 8;

    return (
        <GalleryPanel
            title={t.main.title}
            activeCategory={category}
            onCategoryChange={handleCategoryChange}
            rightAction={
                <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 border border-gray-200">
                    <button
                        onClick={() => handleSortChange('latest')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${sort === 'latest'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {t.main.sortLatest}
                    </button>
                    <button
                        onClick={() => handleSortChange('popular')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${sort === 'popular'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {t.main.sortPopular}
                    </button>
                </div>
            }
            footer={
                showPagination ? (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                    />
                ) : null
            }
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                    <p className="text-gray-400 font-bold animate-pulse">Loading Collection...</p>
                </div>
            ) : (
                <GalleryGrid
                    items={items}
                    isLoggedIn={isAuthenticated}
                    onLikeToggle={handleLikeToggle}
                    onBookmarkToggle={handleBookmarkToggle}
                    onLoginRequired={handleLoginRequired}
                />
            )}
        </GalleryPanel>
    );
}
