'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GalleryItem } from '@/types/gallery';
import Image from 'next/image';
import Viewer3D from './Viewer3D';
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, Gltf, Environment, OrbitControls } from "@react-three/drei";

type Comment = {
    id: string;
    authorNickname: string;
    content: string;
    createdAt: string;
};

type Props = {
    item: GalleryItem;
};

export default function GalleryDetailClient({ item }: Props) {
    const { t } = useLanguage();
    const router = useRouter();
    const { isAuthenticated, authFetch } = useAuth();

    // Interaction State
    const [likeCount, setLikeCount] = useState(item.likeCount || 0);
    const [isLiked, setIsLiked] = useState(item.myReaction === 'LIKE');
    const [isBookmarked, setIsBookmarked] = useState(item.bookmarked || false);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    // View State
    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB' | 'IMG'>('IMG');

    // Recommendations State
    const [recommendations, setRecommendations] = useState<GalleryItem[]>([]);

    useEffect(() => {
        // Increment view count
        fetch(`/api/gallery/${item.id}/view`, { method: 'POST' }).catch(console.error);

        // Function to fetch comments
        const fetchComments = async () => {
            try {
                const res = await fetch(`/api/gallery/${item.id}/comments?page=0&size=50`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data.content || []);
                }
            } catch (error) { console.error("[Comments] Fetch error:", error); }
        };

        // Initial fetch
        fetchComments();

        // Polling every 10 seconds
        const pollInterval = setInterval(fetchComments, 10000);

        // Fetch detail for latest like state
        const fetchDetail = async () => {
            try {
                const res = await authFetch(`/api/gallery/${item.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.likeCount !== undefined) setLikeCount(data.likeCount);
                    if (data.myReaction !== undefined) setIsLiked(data.myReaction === 'LIKE');
                    if (data.bookmarked !== undefined) setIsBookmarked(data.bookmarked);
                }
            } catch (error) { console.error(error); }
        };
        fetchDetail();

        // Fetch recommendations (latest items)
        const fetchRecommendations = async () => {
            try {
                const res = await fetch(`/api/gallery?page=0&size=12&sort=latest`);
                if (res.ok) {
                    const data = await res.json();
                    const filtered = (data.content || []).filter((i: GalleryItem) => i.id !== item.id);
                    setRecommendations(filtered.slice(0, 10));
                }
            } catch (error) { console.error("[Recs] Fetch error:", error); }
        };
        fetchRecommendations();

        return () => clearInterval(pollInterval);
    }, [item.id, authFetch]);

    const handleLikeToggle = async () => {
        if (!isAuthenticated) return alert('로그인이 필요합니다.');
        try {
            const res = await authFetch(`/api/gallery/${item.id}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'LIKE' }),
            });
            if (res.ok) {
                const data = await res.json();
                const newLiked = data.myReaction === 'LIKE';
                setIsLiked(newLiked);
                setLikeCount(data.likeCount);
            }
        } catch (error) { console.error(error); }
    };

    const handleBookmarkToggle = async () => {
        if (!isAuthenticated) return alert('로그인이 필요합니다.');
        try {
            const res = await authFetch(`/api/gallery/${item.id}/bookmark`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setIsBookmarked(data.bookmarked !== undefined ? data.bookmarked : !isBookmarked);
            }
        } catch (error) { console.error(error); }
    };

    const handleCommentSubmit = async () => {
        if (!isAuthenticated) return alert('로그인이 필요합니다.');
        if (!commentInput.trim()) return;
        setCommentLoading(true);
        try {
            const res = await authFetch(`/api/gallery/${item.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput }),
            });
            if (res.ok) {
                const newComment = await res.json();
                setComments(prev => [newComment, ...prev]);
                setCommentInput('');
            }
        } catch (error) { console.error(error); }
        finally { setCommentLoading(false); }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="gallery-layout w-full max-w-[1440px] mx-auto my-6 flex h-[calc(100vh-160px)] gap-3 px-4 relative z-50">
            {/* 1. Left Sidebar - View Modes */}
            <div className="w-64 bg-[#1a1a1a] text-white rounded-3xl overflow-hidden flex flex-col py-6 shrink-0 relative z-20 shadow-2xl">
                <h2 className="text-xl font-bold mb-6 px-8 tracking-wider">BRICKERS</h2>

                <div className="flex flex-col gap-1 flex-1">
                    <button
                        onClick={() => setActiveTab('IMG')}
                        className={`text-left px-8 py-4 transition-all font-medium flex items-center gap-3 ${activeTab === 'IMG'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {t.kids.steps.tabOriginal}
                    </button>
                    <button
                        onClick={() => setActiveTab('LDR')}
                        className={`text-left px-8 py-4 transition-all font-medium flex items-center gap-3 ${activeTab === 'LDR'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {t.kids.steps.tabBrick}
                    </button>
                    <button
                        onClick={() => setActiveTab('GLB')}
                        className={`text-left px-8 py-4 transition-all font-medium flex items-center gap-3 ${activeTab === 'GLB'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {t.kids.steps.tabModeling}
                    </button>
                </div>

                {/* Back Button (Moved to bottom) */}
                <button
                    onClick={() => router.back()}
                    className="mt-auto bg-white/10 text-white rounded-lg px-4 py-3 mx-6 text-sm font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                    ← {t.kids.steps.back}
                </button>
            </div>

            {/* Content Wrapper (Canvas + Right Sidebar) */}
            <div className="flex-1 bg-white rounded-3xl overflow-hidden flex shadow-sm border border-gray-100">
                {/* 2. Main Content Area - Canvas */}
                <div className="flex-1 relative bg-gray-50 flex flex-col overflow-hidden">
                    {/* View Title Bar */}
                    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 justify-between">
                        <div className="text-lg font-extrabold text-gray-900">
                            {activeTab === 'LDR' && t.kids.steps.previewTitle}
                            {activeTab === 'GLB' && t.kids.steps.originalModel}
                            {activeTab === 'IMG' && t.kids.steps.tabOriginal}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 relative bg-[#f0f0f0]">
                        {activeTab === 'LDR' && (
                            item.ldrUrl ? <Viewer3D url={item.ldrUrl} /> : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold">
                                    LDR Model Not Available
                                </div>
                            )
                        )}

                        {activeTab === 'GLB' && (
                            item.glbUrl ? (
                                <div className="absolute inset-0">
                                    <Canvas camera={{ position: [5, 5, 5], fov: 50 }} dpr={[1, 2]}>
                                        <ambientLight intensity={0.8} />
                                        <directionalLight position={[5, 10, 5]} intensity={1.5} />
                                        <Environment preset="city" />
                                        <Bounds fit clip observe margin={1.2}>
                                            <Center>
                                                <Gltf src={item.glbUrl} />
                                            </Center>
                                        </Bounds>
                                        <OrbitControls makeDefault enablePan={false} enableZoom />
                                    </Canvas>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold">
                                    {t.detail.noGlb}
                                </div>
                            )
                        )}

                        {activeTab === 'IMG' && (
                            (item.sourceImageUrl || item.thumbnailUrl) ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-0">
                                    <div className="relative w-full h-full max-w-full max-h-full">
                                        <Image
                                            src={item.sourceImageUrl || item.thumbnailUrl}
                                            alt="Project Image"
                                            fill
                                            className="object-contain" // Maintain aspect ratio
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold">
                                    {t.detail.noImg}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* 3. Right Sidebar - Detail & Comments */}
                <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col shrink-0 relative z-10">
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* User Info Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm">
                                {item.authorNickname ? item.authorNickname[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900">@{item.authorNickname || t.common.anonymous}</span>
                                <span className="text-[10px] text-gray-500 font-semibold tracking-wide">{t.detail.creator}</span>
                            </div>
                        </div>

                        {/* Title & Actions */}
                        <div className="p-6">
                            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-6">{item.title}</h1>

                            <div className="flex items-center gap-6">
                                <button
                                    onClick={handleLikeToggle}
                                    className="flex flex-col items-center gap-1 group transition-all"
                                >
                                    <div className="flex items-center justify-center transition-all">
                                        <svg
                                            className={`w-6 h-6 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400 group-hover:text-red-400'}`}
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                            />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-bold ${isLiked ? 'text-gray-900' : 'text-gray-400'}`}>{likeCount}</span>
                                </button>

                                <button
                                    onClick={handleBookmarkToggle}
                                    className="flex flex-col items-center gap-1 group transition-all"
                                >
                                    <div className="flex items-center justify-center transition-all">
                                        <svg
                                            className={`w-6 h-6 transition-all duration-300 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-400 group-hover:text-yellow-400'}`}
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                            />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-bold ${isBookmarked ? 'text-gray-900' : 'text-gray-400'}`}>{t.detail.save}</span>
                                </button>

                                <button
                                    onClick={() => alert('공유 기능 준비 중')}
                                    className="flex flex-col items-center gap-1 group transition-all ml-auto"
                                >
                                    <div className="flex items-center justify-center transition-all">
                                        <Image src="/icons/share.png" alt="Share" width={22} height={22} className="opacity-60" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">{t.detail.share}</span>
                                </button>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 min-h-[300px]">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                                {t.detail.comments} ({comments.length})
                            </h3>

                            <div className="flex flex-col gap-3">
                                {comments.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <p className="text-sm">{t.detail.noComments}</p>
                                    </div>
                                ) : comments.map(c => (
                                    <div key={c.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-gray-900">@{c.authorNickname}</span>
                                            <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Comment Input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-400"
                                placeholder={isAuthenticated ? t.detail.placeholderComment : t.detail.loginToComment}
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                                disabled={!isAuthenticated || commentLoading}
                            />
                            <button
                                onClick={handleCommentSubmit}
                                disabled={!isAuthenticated || !commentInput.trim() || commentLoading}
                                className="bg-black text-white px-4 rounded-xl font-bold text-[10px] hover:bg-gray-800 disabled:opacity-30 transition-all uppercase"
                            >
                                {t.detail.post}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Recommendation Sidebar */}
                <div className="w-[260px] bg-white border-l border-gray-200 flex flex-col shrink-0 relative z-10 rounded-r-3xl overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                        <h3 className="text-sm font-black text-gray-900 tracking-tight italic uppercase">
                            {t.main.galleryList.allCreations}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                        {recommendations.length > 0 ? (
                            recommendations.map((rec) => {
                                const safeTitle = rec.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
                                const recSlug = `${safeTitle}-${rec.id}`;
                                return (
                                    <button
                                        key={rec.id}
                                        onClick={() => router.push(`/gallery/${recSlug}`)}
                                        className="group text-left flex flex-col gap-2 p-2 rounded-2xl bg-white transition-all border-2 border-black hover:shadow-[4px_4px_0px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
                                    >
                                        <div className="relative aspect-square w-full bg-[#f9f9f9] rounded-xl overflow-hidden border border-gray-100">
                                            {(rec.sourceImageUrl || rec.thumbnailUrl) ? (
                                                <Image
                                                    src={rec.sourceImageUrl || rec.thumbnailUrl}
                                                    alt={rec.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase">No Img</div>
                                            )}
                                        </div>
                                        <div className="px-1">
                                            <h4 className="text-[11px] font-black text-gray-900 line-clamp-1 mb-0.5 tracking-tight group-hover:text-yellow-600 transition-colors">
                                                {rec.title}
                                            </h4>
                                            <p className="text-[9px] font-bold text-gray-400">@{rec.authorNickname || 'Anonymous'}</p>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-20 grayscale">
                                <div className="text-4xl mb-2">📦</div>
                                <div className="text-[10px] font-black uppercase tracking-widest">Loading...</div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
