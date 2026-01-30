import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackgroundBricks from '@/components/BackgroundBricks';

type Props = {
    params: Promise<{ slug: string }>
}

type GalleryDetail = {
    id: string;
    title: string;
    content: string;
    thumbnailUrl: string;
    authorNickname: string;
    createdAt: string;
    likeCount: number;
    viewCount: number;
    tags: string[];
    ldrUrl?: string; // Added for linking to viewer
}

// Helpers
function extractId(slug: string) {
    const parts = slug.split('-');
    return parts[parts.length - 1];
}

async function getGalleryDetail(id: string): Promise<GalleryDetail | null> {
    try {
        const apiBase = process.env.API_BASE || 'http://backend:8080';
        const res = await fetch(`${apiBase}/api/gallery/${id}`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) {
            console.error('Failed to fetch gallery detail:', res.status);
            return null;
        }
        return res.json();
    } catch (error) {
        // Build time에는 backend가 없으므로 null 반환
        console.error('Gallery detail fetch error (likely build time):', error);
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const id = extractId(slug);
    const item = await getGalleryDetail(id);

    if (!item) {
        return {
            title: 'Work Not Found - Brickers',
        }
    }

    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const canonicalSlug = `${safeTitle}-${item.id}`;
    const canonicalUrl = `https://brickers.shop/gallery/${canonicalSlug}`;
    const description = item.content || `${item.title} - ${item.authorNickname || '익명'}님이 만든 AI 레고 작품`;

    return {
        title: item.title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: `${item.title} - Brickers Gallery`,
            description,
            url: canonicalUrl,
            images: [
                {
                    url: item.thumbnailUrl || '/gallery/og-image.png',
                    width: 1200,
                    height: 630,
                    alt: item.title,
                },
            ],
            type: 'article',
            publishedTime: item.createdAt,
            authors: [item.authorNickname || '익명'],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${item.title} - Brickers`,
            description,
            images: [item.thumbnailUrl || '/gallery/og-image.png'],
        },
    }
}

export default async function GalleryDetailPage({ params }: Props) {
    const { slug } = await params;
    const id = extractId(slug);
    const item = await getGalleryDetail(id);

    if (!item) {
        notFound();
    }

    // Generate canonical URL
    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    const canonicalSlug = `${safeTitle}-${item.id}`;
    const canonicalUrl = `https://brickers.shop/gallery/${canonicalSlug}`;

    // JSON-LD structured data for rich snippets
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: item.title,
        description: item.content || `${item.title} - AI로 만든 레고 작품`,
        url: canonicalUrl,
        image: item.thumbnailUrl,
        datePublished: item.createdAt,
        author: {
            '@type': 'Person',
            name: item.authorNickname || '익명',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Brickers',
            url: 'https://brickers.shop',
        },
        interactionStatistic: [
            {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/LikeAction',
                userInteractionCount: item.likeCount,
            },
            {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/ViewAction',
                userInteractionCount: item.viewCount,
            },
        ],
        keywords: item.tags?.join(', ') || '레고, AI, 브릭',
    };

    return (
        <>
            <BackgroundBricks />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-4xl mx-auto p-5">
                <div className="mb-4">
                    <Link href="/gallery" className="text-gray-500 hover:text-black">
                        ← 갤러리로 돌아가기
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Main Image */}
                    <div className="relative aspect-video bg-gray-100">
                        {item.thumbnailUrl ? (
                            <Image
                                src={item.thumbnailUrl}
                                alt={item.title}
                                fill
                                className="object-contain" // contain to show full brick set
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>

                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-4xl font-extrabold">{item.title}</h1>

                            <Link
                                href={`/kids/steps?url=${encodeURIComponent(item.ldrUrl || '')}&isPreset=true`}
                                className="bg-black text-white font-medium text-lg py-3 px-6 rounded-lg hover:opacity-80 transition-opacity"
                            >
                                3D로 보기 & 만들기
                            </Link>
                        </div>

                        {/* Stats Row */}
                        <div className="flex gap-6 text-gray-500 font-medium text-lg">
                            <div className="flex items-center gap-2">
                                <span>👀</span>
                                <span>{item.viewCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>❤️</span>
                                <span>{item.likeCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
