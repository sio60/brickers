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
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [totalElements, setTotalElements] = useState(initialTotalElements);
    const [loading, setLoading] = useState(false);

    const goToPage = async (targetPage: number) => {
        if (loading || targetPage < 0 || targetPage >= totalPages) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/gallery?page=${targetPage}&size=24&sort=latest`);
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []).map((item: any) => ({
                    ...item,
                    isBookmarked: item.bookmarked
                }));
                setItems(content);
                setPage(targetPage);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                // Scroll to top when changing pages
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Failed to load page:', error);
        } finally {
            setLoading(false);
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
        router.push('?login=true');
    };

    // Show pagination only when there are more than 8 items
    const showPagination = totalElements > 8;

    return (
        <>
            <GalleryPanel
                title={t.main.title}
                rightAction={
                    <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black">
                        <option value="latest">{t.main.sortLatest}</option>
                        <option value="popular">{t.main.sortPopular}</option>
                    </select>
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
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                ) : (
                    <GalleryGrid
                        items={items}
                        isLoggedIn={isAuthenticated}
                        onBookmarkToggle={handleBookmarkToggle}
                        onLoginRequired={handleLoginRequired}
                    />
                )}
            </GalleryPanel>
        </>
    );
}
