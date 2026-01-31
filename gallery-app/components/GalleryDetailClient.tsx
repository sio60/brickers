'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GalleryItem } from '@/types/gallery';
import Image from 'next/image';
import Viewer3D from './Viewer3D';

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
    const { isAuthenticated, authFetch } = useAuth();
    const [likeCount, setLikeCount] = useState(item.likeCount || 0);
    const [isLiked, setIsLiked] = useState(item.isBookmarked || false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isCommentOpen, setIsCommentOpen] = useState(true);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Slide 0: Image, 1: 3D
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Increment view count
        fetch(`/api/gallery/${item.id}/view`, { method: 'POST' }).catch(console.error);

        // Function to fetch comments
        const fetchComments = () => {
            fetch(`/api/gallery/${item.id}/comments?page=0&size=50`)
                .then(res => res.json())
                .then(data => {
                    // Only update if count changed or for initial load
                    setComments(data.content || []);
                })
                .catch(console.error);
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
                    if (data.isBookmarked !== undefined) setIsLiked(data.isBookmarked);
                }
            } catch (error) { console.error(error); }
        };
        fetchDetail();

        return () => clearInterval(pollInterval);
    }, [item.id, authFetch]);

    const handleLikeToggle = async () => {
        if (!isAuthenticated) return alert('로그인이 필요합니다.');
        try {
            const res = await authFetch(`/api/gallery/${item.id}/bookmark`, { method: 'POST' });
            if (res.ok) {
                const newState = !isLiked;
                setIsLiked(newState);
                setLikeCount(prev => newState ? prev + 1 : prev - 1);
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

    const router = useRouter();

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center pt-10 sm:pt-16 p-4 sm:p-6 bg-black/5 pointer-events-none overflow-y-auto">
            {/* Top Back Button Area */}
            <div className="w-full max-w-[900px] mb-4 flex justify-start pointer-events-auto shrink-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] text-black hover:bg-gray-50 font-bold transition-all active:scale-95 border border-gray-100"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="mr-1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span className="text-sm">BACK</span>
                </button>
            </div>

            {/* Simple Card Container */}
            <div className="relative pointer-events-auto bg-white w-full max-w-[900px] h-[80vh] min-h-[500px] max-h-[850px] rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col md:flex-row overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Left/Content Section: Image/3D Viewer */}
                <div className="flex-1 relative bg-gray-50 flex flex-col overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                        {currentSlide === 0 ? (
                            <div className="relative w-full h-full p-8 flex items-center justify-center">
                                {item.thumbnailUrl ? (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        className="object-contain" // Contain within the relative box
                                        priority
                                    />
                                ) : (
                                    <div className="text-gray-300 font-bold">이미지가 없습니다</div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full">
                                {item.ldrUrl ? <Viewer3D url={item.ldrUrl} /> : <div className="flex h-full items-center justify-center text-gray-300">3D 모델 없음</div>}
                            </div>
                        )}
                    </div>

                    {/* Navigation for Slides */}
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
                        <button
                            disabled={currentSlide === 0}
                            onClick={() => setCurrentSlide(0)}
                            className={`pointer-events-auto p-3 bg-white/80 backdrop-blur-sm rounded-full transition-all shadow-md group ${currentSlide === 0 ? 'opacity-0 scale-90 translate-x-4' : 'opacity-100'}`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button
                            disabled={currentSlide === 1 || !item.ldrUrl}
                            onClick={() => setCurrentSlide(1)}
                            className={`pointer-events-auto p-3 bg-white/80 backdrop-blur-sm rounded-full transition-all shadow-md group ${currentSlide === 1 || !item.ldrUrl ? 'opacity-0 scale-90 -translate-x-4' : 'opacity-100'}`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>

                    {/* Indicator */}
                    {item.ldrUrl && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === 0 ? 'bg-black w-5' : 'bg-black/20'}`} />
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === 1 ? 'bg-black w-5' : 'bg-black/20'}`} />
                        </div>
                    )}
                </div>

                {/* Right/Info Section: Details & Comments */}
                <div className="w-full md:w-[360px] bg-white flex flex-col border-l border-gray-100 relative">
                    {/* Header: User Info */}
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden border border-gray-200">
                                {item.authorNickname ? item.authorNickname[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-black">@{item.authorNickname || '익명'}</span>
                                <span className="text-[10px] text-gray-400 font-medium">CREATOR</span>
                            </div>
                        </div>
                        {/* Detail View Close? No, navigation back to gallery is done by the page wrapper usually */}
                    </div>

                    {/* Body: Title & Actions */}
                    <div className="p-6 flex flex-col gap-6">
                        <h1 className="text-xl font-bold text-black leading-tight">{item.title}</h1>

                        {/* Interaction Bar */}
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center gap-1 group">
                                <button onClick={handleLikeToggle} className={`transition-transform active:scale-90 ${isLiked ? 'scale-110' : ''}`}>
                                    <Image
                                        src="/icons/like.png"
                                        alt="Like"
                                        width={32}
                                        height={32}
                                        style={isLiked ? { filter: 'invert(48%) sepia(50%) saturate(2243%) hue-rotate(195deg) brightness(101%) contrast(93%)' } : {}}
                                    />
                                </button>
                                <span className={`text-[10px] font-bold transition-colors ${isLiked ? 'text-blue-500' : 'text-gray-500 group-hover:text-black'}`}>{likeCount}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <button onClick={() => alert('공유 기능 준비 중')} className="transition-transform active:scale-90 underline-offset-4">
                                    <Image src="/icons/share.png" alt="Share" width={30} height={30} />
                                </button>
                                <span className="text-[10px] font-bold text-gray-500">Share</span>
                            </div>
                            <div className="ml-auto">
                                <button onClick={() => setIsSaved(!isSaved)} className={`transition-transform active:scale-90 ${isSaved ? 'scale-110' : ''}`}>
                                    <Image
                                        src="/icons/bookmark.png"
                                        alt="Bookmark"
                                        width={30}
                                        height={30}
                                        style={isSaved ? { filter: 'invert(80%) sepia(55%) saturate(2000%) hue-rotate(5deg) brightness(100%) contrast(101%)' } : {}}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Comment Drawer (Always open now) */}
                    <div className="absolute inset-x-0 bottom-0 bg-white border-t border-gray-100 flex flex-col h-[65%] z-20">
                        {/* Drawer Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 shrink-0">
                            <span className="font-bold text-xs uppercase tracking-wider text-gray-500">COMMENTS ({comments.length})</span>
                        </div>

                        {/* Drawer List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-gray-50/50">
                            {comments.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    <span className="text-xs font-bold italic opacity-60">아직 댓글이 없습니다</span>
                                </div>
                            ) : comments.map(c => (
                                <div key={c.id} className="flex gap-3 bg-white p-3 rounded-2xl border border-gray-100/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-[10px] shrink-0 text-gray-500 uppercase">{c.authorNickname[0]}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-xs truncate">@{c.authorNickname}</span>
                                            <span className="text-[9px] text-gray-400 font-medium shrink-0">{formatDate(c.createdAt)}</span>
                                        </div>
                                        <p className="text-xs text-black/80 font-medium leading-relaxed mt-1 break-words">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Drawer Input */}
                        <div className={`p-4 sm:p-6 bg-white border-t border-gray-50 shrink-0 ${!isAuthenticated ? 'opacity-70 grayscale' : ''}`}>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-300 disabled:cursor-not-allowed"
                                    placeholder={isAuthenticated ? "멋진 감상평을 남겨주세요..." : "로그인 후 댓글을 남겨주세요"}
                                    value={commentInput}
                                    onChange={e => setCommentInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                                    disabled={!isAuthenticated || commentLoading}
                                />
                                <button
                                    onClick={handleCommentSubmit}
                                    disabled={!isAuthenticated || !commentInput.trim() || commentLoading}
                                    className="bg-black text-white px-6 rounded-2xl font-bold text-[11px] hover:bg-gray-800 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all uppercase tracking-wider"
                                >
                                    {commentLoading ? '...' : 'POST'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
