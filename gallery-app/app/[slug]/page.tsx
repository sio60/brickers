import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = {
    params: { slug: string }
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
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = extractId(params.slug);
    const item = await getGalleryDetail(id);

    if (!item) {
        return {
            title: 'Work Not Found - Brickers',
        }
    }

    return {
        title: `${item.title} | Brickers Gallery`,
        description: item.content || `${item.title} - Created by ${item.authorNickname || 'Anonymous'}`,
        openGraph: {
            title: `${item.title} - Brickers`,
            description: item.content || 'Check out this amazing Lego creation!',
            images: [item.thumbnailUrl || '/logo.png'],
            type: 'article',
        },
    }
}

export default async function GalleryDetailPage({ params }: Props) {
    const id = extractId(params.slug);
    const item = await getGalleryDetail(id);

    if (!item) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto p-5">
            <div className="mb-4">
                <Link href="/" className="text-gray-500 hover:text-black">
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

                {/* Content */}
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{item.title}</h1>
                            <div className="flex items-center gap-3 text-gray-600">
                                <span className="font-medium">{item.authorNickname || '익명'}</span>
                                <span>•</span>
                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <a
                            href={`https://brickers.shop/kids/steps?url=${encodeURIComponent(item.ldrUrl || '')}&isPreset=true`}
                            className="bg-[#ffd700] hover:bg-[#ffcf00] text-black font-bold py-3 px-6 rounded-xl transition-colors shadow-sm"
                        >
                            3D로 보기 & 만들기
                        </a>
                    </div>

                    <div className="prose max-w-none mb-8">
                        <h3 className="text-lg font-bold mb-2">작품 설명</h3>
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {item.content || '설명이 없습니다.'}
                        </p>
                    </div>

                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {item.tags.map(tag => (
                                <span key={tag} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="border-t pt-6 flex gap-6 text-gray-500">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">👀</span>
                            <span>{item.viewCount} 조회</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">👍</span>
                            <span>{item.likeCount} 좋아요</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
