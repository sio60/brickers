import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Preview3DModal = dynamic(() => import('./Preview3DModal'), {
    ssr: false,
    loading: () => null
});

type GalleryItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    authorNickname: string;
    createdAt: string;
    likeCount: number;
    viewCount: number;
    ldrUrl?: string;
}

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
    const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map((item) => {
                    const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                    const slug = `${safeTitle}-${item.id}`;

                    return (
                        <div
                            key={item.id}
                            className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer"
                            onClick={() => {
                                if (item.ldrUrl) {
                                    setPreviewItem(item);
                                } else {
                                    // Fallback if no LDR (should not happen usually)
                                    window.location.href = `/gallery/${slug}`;
                                }
                            }}
                        >
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                {item.thumbnailUrl ? (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-bold shadow-sm transform translate-y-4 group-hover:translate-y-0 transition-all">
                                        Click to Preview 3D
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-lg truncate mb-1 group-hover:text-[#ffd700] transition-colors">{item.title}</h3>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>{item.authorNickname || '익명'}</span>
                                    <div className="flex gap-2">
                                        <span>👀 {item.viewCount}</span>
                                        <span>👍 {item.likeCount}</span>
                                    </div>
                                </div>
                                <Link
                                    href={`/${slug}`}
                                    className="block mt-3 text-center text-xs font-semibold text-gray-400 hover:text-black border-t pt-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View Details & SEO Page →
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewItem && previewItem.ldrUrl && (
                <Preview3DModal
                    url={previewItem.ldrUrl}
                    onClose={() => setPreviewItem(null)}
                />
            )}
        </>
    );
}
