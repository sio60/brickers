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
        fetch(`/api/gallery/${item.id}/view`, { method: 'POST' }).catch(console.error);
        fetch(`/api/gallery/${item.id}/comments?page=0&size=50`)
            .then(res => res.json())
            .then(data => setComments(data.content || []))
            .catch(console.error);

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
        <div className="w-full min-h-screen pt-20 pb-10 flex items-center justify-center pointer-events-none relative z-10">
            {/* Card Frame (Phone Style) */}
            <div className="bg-white rounded-[40px] border-[3px] border-black w-full max-w-[420px] aspect-[9/16] relative overflow-hidden shadow-2xl pointer-events-auto flex flex-col">

                {/* Main Content Area (Image/3D) */}
                <div className="relative flex-1 bg-white overflow-hidden">
                    {/* Slides */}
                    <div className="absolute inset-0 pb-32"> {/* Leave space for bottom info */}
                        {currentSlide === 0 ? (
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                {item.thumbnailUrl ? (
                                    <Image
                                        src={item.thumbnailUrl}
                                        alt={item.title}
                                        fill
                                        className="object-contain"
                                    />
                                ) : (
                                    <div className="text-gray-300">이미지 없음</div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full rounded-[30px] overflow-hidden border border-gray-100">
                                {item.ldrUrl ? <Viewer3D url={item.ldrUrl} /> : <div className="flex h-full items-center justify-center text-gray-400">3D 모델 없음</div>}
                            </div>
                        )}
                    </div>

                    {/* Navigation Arrows */}
                    {currentSlide === 1 && (
                        <button
                            onClick={() => setCurrentSlide(0)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 active:scale-95 transition-all"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                    )}
                    {currentSlide === 0 && item.ldrUrl && (
                        <button
                            onClick={() => setCurrentSlide(1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 active:scale-95 transition-all"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    )}

                    {/* Right Action Bar (Inside Card, aligned bottom-right of content area) */}
                    <div className="absolute top-[60%] right-4 z-20 flex flex-col items-center gap-5">
                        {/* Like */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={handleLikeToggle}
                                className={`transition-transform active:scale-75 ${isLiked ? 'scale-110' : ''}`}
                            >
                                <Image
                                    src="/icons/like.png"
                                    alt="Like"
                                    width={28}
                                    height={28}
                                    className="drop-shadow-sm"
                                />
                            </button>
                            {Number(likeCount) > 0 && <span className="text-black text-[10px] font-bold">{likeCount}</span>}
                        </div>

                        {/* Comment */}
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={() => setIsCommentOpen(true)} className="transition-transform active:scale-75">
                                <Image src="/icons/comment.png" alt="Comment" width={26} height={26} className="drop-shadow-sm" />
                            </button>
                            {comments.length > 0 && <span className="text-black text-[10px] font-bold">{comments.length}</span>}
                        </div>

                        {/* Share */}
                        <div className="flex flex-col items-center gap-1">
                            <button className="transition-transform active:scale-75" onClick={() => alert('공유 기능은 준비 중입니다!')}>
                                <Image src="/icons/share.png" alt="Share" width={26} height={26} className="drop-shadow-sm" />
                            </button>
                        </div>

                        {/* Bookmark */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                className={`transition-transform active:scale-75 ${isSaved ? 'scale-110' : ''}`}
                                onClick={() => setIsSaved(!isSaved)}
                            >
                                <Image src="/icons/bookmark.png" alt="Bookmark" width={26} height={26} className="drop-shadow-sm" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Info Section (User Profile & Title) */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-white flex flex-col justify-end p-6 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        {/* Profile Image */}
                        <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                            <div className="font-bold text-gray-400 text-lg">
                                {item.authorNickname ? item.authorNickname[0].toUpperCase() : '?'}
                            </div>
                        </div>
                        {/* Nickname */}
                        <span className="font-bold text-black text-sm">{item.authorNickname || '익명'}</span>
                    </div>
                    {/* Title */}
                    <div className="font-medium text-black text-sm pl-1">{item.title}</div>
                </div>

            </div>

            {/* Comment Drawer (Overlay within card or global modal?) */}
            {/* Let's make it a global modal for better UX on this layout */}
            {isCommentOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-[400px] h-[600px] rounded-[30px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold">댓글</h3>
                            <button onClick={() => setIsCommentOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {comments.length === 0 ? (
                                <div className="text-center text-gray-400 mt-20">댓글이 없습니다.</div>
                            ) : comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{c.authorNickname[0]}</div>
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
                        <div className="p-4 bg-gray-50 border-t flex gap-2">
                            <input
                                className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black"
                                placeholder="댓글 입력..."
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                            />
                            <button onClick={handleCommentSubmit} disabled={!commentInput.trim()} className="font-bold text-blue-500 text-sm px-2 disabled:opacity-30">게시</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
