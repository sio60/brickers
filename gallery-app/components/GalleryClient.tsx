'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GalleryPanel from './GalleryPanel';
import GalleryThumbnail from './GalleryThumbnail';
import GalleryPreview from './GalleryPreview';
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
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(initialItems[0] || null);

    // Reset selected item when items change
    useEffect(() => {
        if (items.length > 0) {
            setSelectedItem(items[0]);
        } else {
            setSelectedItem(null);
        }
    }, [items]);

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
                // Scroll to top of the thumbnail grid list if possible, or just the window
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

    const updateItemInListAndSelected = (id: string, updateFn: (item: GalleryItem) => GalleryItem) => {
        setItems(prev => prev.map(item => item.id === id ? updateFn(item) : item));
        if (selectedItem?.id === id) {
            setSelectedItem(prev => prev ? updateFn(prev) : null);
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
                updateItemInListAndSelected(id, (item) => ({
                    ...item,
                    myReaction: data.myReaction === 'LIKE' ? 'LIKE' : null,
                    likeCount: data.likeCount !== undefined ? data.likeCount : (data.myReaction === 'LIKE' ? (item.likeCount || 0) + 1 : (item.likeCount || 0) - 1)
                }));
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

                if (category === 'bookmarks' && !data.bookmarked) {
                    setItems(prev => prev.filter(item => item.id !== id));
                    setTotalElements(prev => prev - 1);
                    // Selected item will be reset by the useEffect above
                } else {
                    updateItemInListAndSelected(id, (item) => ({
                        ...item,
                        bookmarked: data.bookmarked
                    }));
                }
            }
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
        }
    };

    const handleLoginRequired = () => {
        router.push('?login=true');
    };

    const showPagination = totalElements > 24;

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
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-lg font-medium">{t.main.noItems}</p>
                </div>
            ) : (
                <div className="flex gap-8 h-full min-h-[500px]">
                    {/* Left: Preview */}
                    <div className="flex-[1.2] min-w-0">
                        {selectedItem && (
                            <GalleryPreview
                                item={selectedItem}
                                isLoggedIn={isAuthenticated}
                                onLikeToggle={handleLikeToggle}
                                onBookmarkToggle={handleBookmarkToggle}
                                onLoginRequired={handleLoginRequired}
                            />
                        )}
                    </div>

                    {/* Right: Scrollable Grid */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                            {items.map((item) => (
                                <GalleryThumbnail
                                    key={item.id}
                                    item={item}
                                    isSelected={selectedItem?.id === item.id}
                                    onClick={setSelectedItem}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </GalleryPanel>
    );
}
