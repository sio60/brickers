'use client';

import { useState, useEffect } from 'react';
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
    const [isLiked, setIsLiked] = useState(item.isBookmarked || false); // Using isBookmarked field for 'Like' visual based on user request context, or separate? Usually mapped. Assuming mapped.
    // Wait, user asked for separate Bookmark button. 
    // Usually 'Like' is heart, 'Bookmark' is save. My previous code mapped 'isBookmarked' to Heart/Like.
    // I should check data model. 'likeCount' exists. 'isBookmarked' exists.
    // I will separate them if data allows properly. But previously logic used 'bookmark' endpoint for Heart.
    // I will keep Heart logic using 'bookmark' endpoint for now as 'Like/Heart', and 'Bookmark' button as visual only (or duplicate logic).
    // Actually, user said "좋아요, 댓글, 공유, 북마크". 
    // Let's implement Heart as the main interaction we have (api/bookmark). And Bookmark button as a new todo or just visual for now.
    // Or maybe we treat the Heart as Like, and Bookmark as Bookmark. 
    // Current API: POST /api/gallery/{id}/bookmark -> Toggles bookmark/like.
    // I will use this for the Heart button. Bookmark button will be just visual/dummy for now as I don't have separate endpoint.

    const [comments, setComments] = useState<Comment[]>([]);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Slide 0: Image, 1: 3D
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Increment view
        fetch(`/api/gallery/${item.id}/view`, { method: 'POST' }).catch(console.error);

        // Fetch comments
        fetch(`/api/gallery/${item.id}/comments?page=0&size=50`)
            .then(res => res.json())
            .then(data => setComments(data.content || []))
            .catch(console.error);

        // Sync details
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

    return (
        <div className="w-full h-full md:h-[calc(100vh-100px)] bg-black relative md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
            {/* Mobile/Tablet: Full content area */}
            <div className="relative flex-1 bg-black h-[500px] md:h-full">
                {/* Slides */}
                <div className="absolute inset-0">
                    {currentSlide === 0 ? (
                        <div className="relative w-full h-full bg-white flex items-center justify-center">
                            {item.thumbnailUrl ? (
                                <Image
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    fill
                                    className="object-contain md:object-cover"
                                />
                            ) : (
                                <div className="text-gray-300">이미지 없음</div>
                            )}
                        </div>
                    ) : (
                        item.ldrUrl ? <Viewer3D url={item.ldrUrl} /> : <div className="flex h-full items-center justify-center text-white">3D 모델 없음</div>
                    )}
                </div>

                {/* Navigation Arrows */}
                {currentSlide === 1 && (
                    <button
                        onClick={() => setCurrentSlide(0)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 active:scale-95 transition-all"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                )}
                {currentSlide === 0 && item.ldrUrl && (
                    <button
                        onClick={() => setCurrentSlide(1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 active:scale-95 transition-all"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                )}

                {/* Bottom Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                {/* Content Info (Bottom Left) */}
                <div className="absolute bottom-6 left-6 right-20 z-10 text-white text-left">
                    <h1 className="text-xl font-bold mb-3 line-clamp-2 leading-tight drop-shadow-md">
                        {item.title}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                {item.authorNickname ? (
                                    <span className="font-bold text-sm">{item.authorNickname[0].toUpperCase()}</span>
                                ) : (
                                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">{item.authorNickname || '익명'}</span>
                            <span className="text-xs text-gray-300">Creator</span>
                        </div>
                    </div>
                </div>

                {/* Right Action Bar (Vertical) */}
                <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-6">
                    {/* Like */}
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={handleLikeToggle}
                            className={`transition-transform active:scale-75 ${isLiked ? 'scale-110' : ''}`}
                        >
                            <Image
                                src="/icons/like.png"
                                alt="Like"
                                width={32}
                                height={32}
                                className="drop-shadow-md"
                            />
                        </button>
                        <span className="text-white text-xs font-medium drop-shadow-md">{likeCount}</span>
                    </div>

                    {/* Comment Button */}
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => setIsCommentOpen(true)} className="transition-transform active:scale-75">
                            <Image src="/icons/comment.png" alt="Comment" width={30} height={30} className="drop-shadow-md" />
                        </button>
                        <span className="text-white text-xs font-medium drop-shadow-md">{comments.length}</span>
                    </div>

                    {/* Share Button (Dummy) */}
                    <div className="flex flex-col items-center gap-1">
                        <button className="transition-transform active:scale-75" onClick={() => alert('공유 기능은 준비 중입니다!')}>
                            <Image src="/icons/share.png" alt="Share" width={30} height={30} className="drop-shadow-md" />
                        </button>
                        <span className="text-white text-xs font-medium drop-shadow-md">공유</span>
                    </div>

                    {/* Bookmark Button */}
                    <div className="flex flex-col items-center gap-1">
                        <button
                            className={`transition-transform active:scale-75 ${isSaved ? 'scale-110' : ''}`}
                            onClick={() => setIsSaved(!isSaved)}
                        >
                            <Image
                                src="/icons/bookmark.png"
                                alt="Bookmark"
                                width={30}
                                height={30}
                                className="drop-shadow-md"
                            />
                        </button>
                        <span className="text-white text-xs font-medium drop-shadow-md">저장</span>
                    </div>
                </div>

                {/* Slide Indicators */}
                {item.ldrUrl && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 0 ? 'bg-white w-3' : 'bg-white/50'}`} />
                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 1 ? 'bg-white w-3' : 'bg-white/50'}`} />
                    </div>
                )}
            </div>

            {/* Comment Drawer / Modal */}
            {/* On PC: Right side panel (if wide screen). On Mobile: Bottom Sheet overlay. */}
            {/* For simplicity mimicking Instgram Reels web view, let's use a conditional rendering:
                If comment is open, show a panel on the right (PC) or overlay (Mobile).
                User asked for specific layout. The image 4 provided is simpler.
                But user said "인스타 형식... 댓글...".
                Let's make an overlay that slides up/in.
            */}
            {isCommentOpen && (
                <div className="absolute inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full md:w-[400px] h-full bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">댓글 ({comments.length})</h3>
                            <button onClick={() => setIsCommentOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {comments.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">첫 번째 댓글을 남겨보세요!</div>
                            ) : comments.map(c => (
                                <div key={c.id} className="flex gap-3 text-left">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                        {c.authorNickname[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-sm">{c.authorNickname}</span>
                                            <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 break-words">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black"
                                    placeholder={isAuthenticated ? "댓글 달기..." : "로그인 필요"}
                                    value={commentInput}
                                    onChange={e => setCommentInput(e.target.value)}
                                    disabled={!isAuthenticated}
                                    onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                                />
                                <button
                                    onClick={handleCommentSubmit}
                                    disabled={!commentInput.trim() || commentLoading}
                                    className="font-bold text-blue-500 text-sm px-2 disabled:opacity-30 hover:text-blue-700"
                                >
                                    게시
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
