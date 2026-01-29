import { Metadata } from 'next';
import GalleryClient from '../components/GalleryClient';
import { GalleryItem, PageResponse } from '../types/gallery';

// Metadata for the gallery home page
export const metadata: Metadata = {
    title: 'AI 레고 작품 갤러리',
    description: 'AI로 만든 멋진 레고 작품들을 구경하세요. 다양한 창작물을 감상하고 직접 만들어보세요.',
    alternates: {
        canonical: '/gallery',
    },
    openGraph: {
        title: 'Brickers Gallery - AI 레고 작품 갤러리',
        description: 'AI로 만든 멋진 레고 작품들을 구경하세요.',
        url: 'https://brickers.shop/gallery',
        type: 'website',
    },
};

// Function to fetch gallery items (Server-side)
async function getGalleryItems(): Promise<PageResponse<GalleryItem>> {
    const apiBase = process.env.API_BASE || 'http://backend:8080';

    try {
        const res = await fetch(`${apiBase}/api/gallery?size=24&sort=latest`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            console.error('Failed to fetch gallery:', res.status);
            return { content: [], last: true, totalPages: 0, totalElements: 0, number: 0 };
        }

        const json = await res.json();
        const content = json.content.map((item: any) => ({
            ...item,
            isBookmarked: item.bookmarked
        }));

        return {
            ...json,
            content
        };
    } catch (error) {
        console.error('Gallery fetch error (likely build time):', error);
        return { content: [], last: true, totalPages: 0, totalElements: 0, number: 0 };
    }
}

export default async function GalleryHome() {
    const data = await getGalleryItems();

    // JSON-LD structured data for SEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Brickers Gallery',
        description: 'AI로 만든 멋진 레고 작품들을 구경하세요.',
        url: 'https://brickers.shop/gallery',
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: data.content.length,
            itemListElement: data.content.slice(0, 10).map((item, index) => {
                const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                const slug = `${safeTitle}-${item.id}`;
                return {
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `https://brickers.shop/gallery/${slug}`,
                    name: item.title,
                };
            }),
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="relative z-10 px-4 py-6">
                <GalleryClient
                    initialItems={data.content}
                    initialHasMore={!data.last}
                />
            </div>
        </>
    );
}
