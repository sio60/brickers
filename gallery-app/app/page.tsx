import { Metadata } from 'next';
import LandingPageClient from '@/components/gallery/LandingPageClient';
import { GalleryItem } from '@/types/gallery';

// Metadata for SEO
export const metadata: Metadata = {
    title: 'Brickers - AI 브릭 생성기',
    description: '이미지를 업로드하면 AI가 브릭 조립 설명서를 만들어줍니다. 누구나 쉽게 나만의 브릭 작품을 만들어보세요.',
    keywords: ['브릭', 'BRICK', 'AI', '조립', '설명서', '3D', '생성기'],
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'Brickers - AI 브릭 생성기',
        description: '이미지를 업로드하면 AI가 브릭 조립 설명서를 만들어줍니다.',
        url: 'https://brickers.shop',
        siteName: 'Brickers',
        type: 'website',
        locale: 'ko_KR',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Brickers - AI 브릭 생성기',
        description: '이미지를 업로드하면 AI가 브릭 조립 설명서를 만들어줍니다.',
    },
};

// Server-side fetch for gallery items
async function getGalleryItems(): Promise<GalleryItem[]> {
    const apiBase = process.env.API_BASE || 'http://backend:8080';

    try {
        const res = await fetch(`${apiBase}/api/gallery?page=0&size=24&sort=latest`, {
            next: { revalidate: 60 }, // Cache for 60 seconds
        });

        if (!res.ok) {
            console.warn('Gallery API returned non-OK status:', res.status);
            return [];
        }

        const data = await res.json();
        return data.content || [];
    } catch (error) {
        console.warn('Gallery fetch failed (expected during local dev if backend is down):', error instanceof Error ? error.message : error);
        return [];
    }
}

export default async function LandingPage() {
    const galleryItems = await getGalleryItems();

    // JSON-LD structured data for SEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Brickers',
        description: '이미지를 업로드하면 AI가 브릭 조립 설명서를 만들어줍니다.',
        url: 'https://brickers.shop',
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'KRW',
        },
        creator: {
            '@type': 'Organization',
            name: 'Brickers',
        },
        // Featured gallery items
        hasPart: galleryItems.length > 0 ? {
            '@type': 'ItemList',
            name: 'Featured Creations',
            numberOfItems: galleryItems.length,
            itemListElement: galleryItems.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'ImageObject',
                    name: item.title,
                    contentUrl: item.thumbnailUrl,
                    creator: {
                        '@type': 'Person',
                        name: item.authorNickname || 'Anonymous',
                    },
                },
            })),
        } : undefined,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <LandingPageClient initialItems={galleryItems} />
        </>
    );
}
