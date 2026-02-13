'use client';

import { useState, useEffect, useCallback } from 'react';
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

    const fetchData = useCallback(async (targetPage: number, targetSort: string, targetCategory: string) => {
        setLoading(true);
        try {
            const endpoint = targetCategory === 'bookmarks' ? '/api/gallery/bookmarks/my' : '/api/gallery';
            const fetcher = isAuthenticated ? authFetch : fetch;

            const res = await fetcher(`${endpoint}?page=${targetPage}&size=24&sort=${targetSort}`);
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []).map((item: any) => ({
                    ...item,
                    id: item.id || item.postId,
                    bookmarked: targetCategory === 'bookmarks' ? true : item.bookmarked,
                    myReaction: item.myReaction || (item.liked ? 'LIKE' : null) // 백엔드 필드명 대응
                }));
                setItems(content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                if (targetPage !== page) {
                    setPage(targetPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else if (targetCategory === 'bookmarks') {
                // Fallback for bookmarks if API fails
                const bookmarkedOnly = initialItems.filter(i => i.bookmarked);
                setItems(bookmarkedOnly);
                setTotalPages(1);
                setTotalElements(bookmarkedOnly.length);
            }
        } catch (error) {
            console.error('Failed to fetch gallery data:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, authFetch, initialItems, page]);

    // 로그인 상태가 확인되면(isAuthenticated가 true로 바뀌면) 데이터를 다시 불러옵니다.
    useEffect(() => {
        if (isAuthenticated) {
            fetchData(page, sort, category);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const goToPage = (targetPage: number) => {
        if (loading || targetPage < 0 || targetPage >= totalPages) return;
        fetchData(targetPage, sort, category);
    };

    const handleCategoryChange = (newCategory: string) => {
        if (newCategory === category) return;
        if (newCategory === 'bookmarks' && !isAuthenticated) {
            router.push('?login=true');
            return;
        }

        setCategory(newCategory);
        setPage(0);
        fetchData(0, sort, newCategory);
    };

    const handleSortChange = (newSort: string) => {
        if (newSort === sort) return;

        setSort(newSort);
        setPage(0);
        fetchData(0, newSort, category);
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
                setItems((prev: GalleryItem[]) =>
                    prev.map((item: GalleryItem) =>
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
                    setItems((prev: GalleryItem[]) => prev.filter((item: GalleryItem) => item.id !== id));
                    setTotalElements((prev: number) => prev - 1);
                } else {
                    setItems((prev: GalleryItem[]) =>
                        prev.map((item: GalleryItem) =>
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
                <div className="flex items-center gap-3">
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
                    <button
                        onClick={() => router.back()}
                        className="w-11 h-11 border-none bg-transparent text-2xl font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90"
                        aria-label="close"
                    >
                        ✕
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
