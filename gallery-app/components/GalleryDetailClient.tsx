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
    const [isLiked, setIsLiked] = useState(item.isBookmarked || false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Slide 0: Image, 1: 3D
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Increment view count
        fetch(`/api/gallery/${item.id}/view`, { method: 'POST' }).catch(console.error);

        // Fetch initial comments
        fetch(`/api/gallery/${item.id}/comments?page=0&size=50`)
            .then(res => res.json())
            .then(data => setComments(data.content || []))
            .catch(console.error);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-transparent pointer-events-none">
            {/* The Smartphone-style Card */}
            <div className="relative pointer-events-auto bg-white w-full max-w-[420px] h-[85vh] max-h-[850px] aspect-[9/16] rounded-[45px] border-[5px] border-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Content Area (Image/3D) */}
                <div className="relative flex-1 bg-white overflow-hidden">
                    {/* Centered Image/Viewer within the card frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 pb-24">
                        {currentSlide === 0 ? (
                            <div className="relative w-full h-full">
                                {item.thumbnailUrl ? (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        className="object-contain" // Contain within the relative box
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200 uppercase font-black text-4xl">No Image</div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full rounded-[30px] overflow-hidden">
                                {item.ldrUrl ? <Viewer3D url={item.ldrUrl} /> : <div className="flex h-full items-center justify-center text-gray-300">No 3D Model</div>}
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
                        {currentSlide === 1 ? (
                            <button onClick={() => setCurrentSlide(0)} className="pointer-events-auto p-2 bg-white/50 hover:bg-white rounded-full transition-colors shadow-sm">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                        ) : <div />}
                        {currentSlide === 0 && item.ldrUrl ? (
                            <button onClick={() => setCurrentSlide(1)} className="pointer-events-auto p-2 bg-white/50 hover:bg-white rounded-full transition-colors shadow-sm">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        ) : <div />}
                    </div>

                    {/* Floating Side Action Bar */}
                    <div className="absolute bottom-32 right-5 flex flex-col items-center gap-6 z-20">
                        {/* Like */}
                        <div className="flex flex-col items-center">
                            <button onClick={handleLikeToggle} className={`active:scale-90 transition-transform ${isLiked ? 'scale-110' : ''}`}>
                                <Image src="/icons/like.png" alt="Like" width={32} height={32} />
                            </button>
                            <span className="text-[10px] font-bold text-black mt-1">{likeCount}</span>
                        </div>
                        {/* Comments */}
                        <div className="flex flex-col items-center">
                            <button onClick={() => setIsCommentOpen(true)} className="active:scale-90 transition-transform">
                                <Image src="/icons/comment.png" alt="Comment" width={30} height={30} />
                            </button>
                            <span className="text-[10px] font-bold text-black mt-1">{comments.length}</span>
                        </div>
                        {/* Share */}
                        <button onClick={() => alert('공유 기능 준비 중')} className="active:scale-90 transition-transform">
                            <Image src="/icons/share.png" alt="Share" width={30} height={30} />
                        </button>
                        {/* Bookmark */}
                        <button onClick={() => setIsSaved(!isSaved)} className={`active:scale-90 transition-transform ${isSaved ? 'scale-110' : ''}`}>
                            <Image src="/icons/bookmark.png" alt="Bookmark" width={30} height={30} />
                        </button>
                    </div>
                </div>

                {/* Bottom Profile Area */}
                <div className="bg-white px-8 py-8 flex flex-col gap-2 shrink-0 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center font-bold text-sm overflow-hidden">
                            {item.authorNickname ? item.authorNickname[0].toUpperCase() : 'B'}
                        </div>
                        <span className="font-black text-black text-sm">{item.authorNickname || 'BRICKER User'}</span>
                    </div>
                    <div className="text-black font-bold text-lg leading-tight pl-1 line-clamp-1">{item.title}</div>
                </div>
            </div>

            {/* Modal for Comments */}
            {isCommentOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto p-4">
                    <div className="bg-white w-full max-w-[400px] h-[600px] rounded-[40px] border-[5px] border-black shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b-4 border-black flex items-center justify-between">
                            <h3 className="font-black text-lg">COMMENTS</h3>
                            <button onClick={() => setIsCommentOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {comments.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-gray-300 font-bold italic">No comments yet.</div>
                            ) : comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black text-xs shrink-0">{c.authorNickname[0]}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm">{c.authorNickname}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{formatDate(c.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed mt-1">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-50 border-t-4 border-black flex gap-3">
                            <input
                                className="flex-1 bg-white border-4 border-black rounded-2xl px-4 py-2 text-sm font-bold focus:outline-none"
                                placeholder="Write a comment..."
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                            />
                            <button onClick={handleCommentSubmit} disabled={!commentInput.trim() || commentLoading} className="bg-black text-white px-6 rounded-2xl font-black text-xs hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95 uppercase">Send</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
