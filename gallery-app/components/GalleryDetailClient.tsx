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
    const [isBookmarked, setIsBookmarked] = useState(item.isBookmarked || false);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    // View State
    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB' | 'IMG'>('IMG');

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
                const newLiked = data.currentReaction === 'LIKE';
                setIsLiked(newLiked);
                if (data.likeCount !== undefined) setLikeCount(data.likeCount);
                else setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
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
        <div className="gallery-layout w-full max-w-7xl mx-auto my-6 flex h-[calc(100vh-160px)] gap-6 px-4 relative z-50">
            {/* 1. Left Sidebar - View Modes */}
            <div className="w-[240px] bg-[#1a1a1a] text-white rounded-3xl overflow-hidden flex flex-col py-6 shrink-0 relative z-20 shadow-2xl">
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
                            item.sourceImageUrl ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-8">
                                    <div className="relative w-full h-full max-w-2xl max-h-full">
                                        <Image
                                            src={item.sourceImageUrl}
                                            alt="Original Source"
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
                <div className="w-[440px] bg-white border-l border-gray-200 flex flex-col shrink-0 relative z-10">
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
                                    className={`flex flex-col items-center gap-1 group transition-all ${isLiked ? 'scale-110' : 'hover:scale-105'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border transition-all ${isLiked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                                        <Image
                                            src="/icons/like.png"
                                            alt="Like"
                                            width={24}
                                            height={24}
                                            style={isLiked ? { filter: 'invert(48%) sepia(50%) saturate(2243%) hue-rotate(195deg) brightness(101%) contrast(93%)' } : { opacity: 0.6 }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold ${isLiked ? 'text-blue-500' : 'text-gray-400'}`}>{likeCount}</span>
                                </button>

                                <button
                                    onClick={handleBookmarkToggle}
                                    className={`flex flex-col items-center gap-1 group transition-all ${isBookmarked ? 'scale-110' : 'hover:scale-105'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border transition-all ${isBookmarked ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                                        <Image
                                            src="/icons/bookmark.png"
                                            alt="Bookmark"
                                            width={24}
                                            height={24}
                                            style={isBookmarked ? { filter: 'invert(80%) sepia(55%) saturate(2000%) hue-rotate(5deg) brightness(100%) contrast(101%)' } : { opacity: 0.6 }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold ${isBookmarked ? 'text-yellow-500' : 'text-gray-400'}`}>{t.detail.save}</span>
                                </button>

                                <button
                                    onClick={() => alert('공유 기능 준비 중')}
                                    className="flex flex-col items-center gap-1 group hover:scale-105 transition-all ml-auto"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-300">
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
            </div>
        </div>
    );
}
