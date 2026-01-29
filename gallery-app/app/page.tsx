import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

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

// Types (You might want to move these to a types file)
type GalleryItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    authorNickname: string;
    createdAt: string;
    likeCount: number;
    viewCount: number;
}

type PageResponse<T> = {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    number: number;
}

// Function to fetch gallery items
async function getGalleryItems(): Promise<PageResponse<GalleryItem>> {
    // Use environment variable or default to Docker service name
    const apiBase = process.env.API_BASE || 'http://backend:8080';

    try {
        const res = await fetch(`${apiBase}/api/gallery?size=24&sort=latest`, {
            next: { revalidate: 60 }, // ISR: Revalidate every 60 seconds
        });

        if (!res.ok) {
            console.error('Failed to fetch gallery:', res.status);
            return { content: [], last: true, totalPages: 0, totalElements: 0, number: 0 };
        }

        return res.json();
    } catch (error) {
        // Build time에는 backend가 없으므로 빈 데이터 반환
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
            <div className="max-w-[1280px] mx-auto p-5">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-2">Gallery</h1>
                <p className="text-gray-600">AI로 만든 멋진 레고 작품들을 구경하세요.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data.content.map((item) => {
                    // Create a SEO friendly slug: title-id
                    // Simple slugify: replace spaces with - and encoded URI
                    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                    const slug = `${safeTitle}-${item.id}`;

                    return (
                        <Link
                            key={item.id}
                            href={`/${slug}`}
                            className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                        >
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                {item.thumbnailUrl ? (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg truncate mb-1">{item.title}</h3>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>{item.authorNickname || '익명'}</span>
                                    <div className="flex gap-2">
                                        <span>👀 {item.viewCount}</span>
                                        <span>👍 {item.likeCount}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
        </>
    );
}
