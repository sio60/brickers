import { MetadataRoute } from 'next';

type GalleryItem = {
    id: string;
    title: string;
    updatedAt?: string;
    createdAt: string;
}

type PageResponse<T> = {
    content: T[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const apiBase = process.env.API_BASE || 'http://backend:8080';
    const baseUrl = 'https://brickers.shop/gallery'; // Base URL for public access

    try {
        // Fetch up to 500 items for the sitemap
        const res = await fetch(`${apiBase}/api/gallery?size=500&sort=latest`, {
            next: { revalidate: 3600 } // Revalidate every hour
        });

        if (!res.ok) {
            console.error('Failed to fetch gallery for sitemap');
            return [];
        }

        const data: PageResponse<GalleryItem> = await res.json();

        const items = data.content.map((item) => {
            // Slug generation must match page.tsx logic
            const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
            const slug = `${safeTitle}-${item.id}`;

            return {
                url: `${baseUrl}/${slug}`,
                lastModified: new Date(item.updatedAt || item.createdAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            };
        });

        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
            ...items,
        ];

    } catch (e) {
        console.error('Sitemap generation error (likely build time):', e);
        // 빌드 시에도 최소한의 sitemap 반환
        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
        ];
    }
}
