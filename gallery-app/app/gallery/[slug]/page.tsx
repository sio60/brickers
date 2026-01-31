import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import GalleryDetailClient from '@/components/GalleryDetailClient';
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
    if (!slug) return '';
    try {
        const decodedSlug = decodeURIComponent(slug);
        const parts = decodedSlug.split('-');
        return parts[parts.length - 1];
    } catch (e) {
        // Fallback for non-encoded or poorly encoded slugs
        const parts = slug.split('-');
        return parts[parts.length - 1];
    }
}

async function getGalleryDetail(id: string): Promise<GalleryDetail | null> {
    if (!id) return null;
    try {
        const apiBase = process.env.API_BASE || 'http://backend:8080';
        console.log(`[SSR] Fetching gallery detail for ID: ${id} from ${apiBase}`);

        const res = await fetch(`${apiBase}/api/gallery/${id}`, {
            next: { revalidate: 60 },
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => 'No error body');
            console.error(`[SSR] API Error (${res.status}):`, errorText);
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error('[SSR] Gallery detail fetch unexpected error:', error);
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
            <div className="relative z-10 px-4 py-6">
                <div className="max-w-4xl mx-auto">


                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        {/* Main Image */}
                        <div className="relative h-[400px] md:h-[500px] bg-gray-50">
                            {item.thumbnailUrl ? (
                                <Image
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Image
                                </div>
                            )}
                        </div>

                        <GalleryDetailClient item={item} />
                    </div>
                </div>
            </div>
        </>
    );
}
