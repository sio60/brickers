'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GalleryItem } from '@/types/gallery';
import Link from 'next/link';

type Comment = {
    id: string;
    authorNickname: string;
    authorProfileImage?: string;
    content: string;
    createdAt: string;
};

type Props = {
    item: GalleryItem;
};

export default function GalleryDetailClient({ item }: Props) {
    const { isAuthenticated, authFetch } = useAuth();
    const [likeCount, setLikeCount] = useState(item.likeCount || 0);
    const [viewCount, setViewCount] = useState(item.viewCount || 0);
    const [isLiked, setIsLiked] = useState(item.isBookmarked || false);

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    useEffect(() => {
        const incrementView = async () => {
            try {
                const res = await fetch(`/api/gallery/${item.id}/view`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.viewCount !== undefined) setViewCount(data.viewCount);
                }
            } catch (error) {
                console.error('Failed to increment view count:', error);
            }
        };

        const fetchComments = async () => {
            try {
                const res = await fetch(`/api/gallery/${item.id}/comments?page=0&size=50`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data.content || []);
                }
            } catch (error) {
                console.error('Failed to fetch comments:', error);
            }
        };

        if (item.id) {
            incrementView();
            fetchComments();
        }
    }, [item.id]);

    const handleLikeToggle = async () => {
        if (!isAuthenticated) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            const res = await authFetch(`/api/gallery/${item.id}/bookmark`, {
                method: 'POST',
            });

            if (res.ok) {
                const newState = !isLiked;
                setIsLiked(newState);
                setLikeCount(prev => newState ? prev + 1 : prev - 1);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    };

    const handleCommentSubmit = async () => {
        if (!isAuthenticated) {
            alert('로그인이 필요합니다.');
            return;
        }
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
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const min = date.getMinutes().toString().padStart(2, '0');
        return `${month}/${day} ${hour}:${min}`;
    };

    return (
        <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight mb-2">
                        {item.title}
                    </h1>
                    <p className="text-gray-400 font-medium">
                        Created by <span className="text-black font-bold">@{item.authorNickname || '익명'}</span>
                    </p>
                </div>

                <Link
                    href={`/kids/steps?url=${encodeURIComponent(item.ldrUrl || '')}&isPreset=true`}
                    className="w-full md:w-auto bg-black text-white font-bold text-lg py-4 px-10 rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                    <span>3D로 보기 & 만들기</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {/* Interaction Row */}
            <div className="flex items-center gap-8 pt-8 border-t-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Views</span>
                        <span className="text-2xl font-black text-black leading-tight">{viewCount}</span>
                    </div>
                </div>

                <button
                    onClick={handleLikeToggle}
                    className="flex items-center gap-3 group group-active:scale-90 transition-all"
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isLiked ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-black hover:bg-gray-200'}`}>
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill={isLiked ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform duration-300 ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`}
                        >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.505 4.045 3 5.5l7 7Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-xs font-bold uppercase tracking-widest leading-none transition-colors ${isLiked ? 'text-black' : 'text-gray-400'}`}>Likes</span>
                        <span className="text-2xl font-black text-black leading-tight">{likeCount}</span>
                    </div>
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Comments</span>
                        <span className="text-2xl font-black text-black leading-tight">{comments.length}</span>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-black text-black mb-6">Comments</h2>

                {/* Comment Input */}
                <div className="flex gap-4 mb-8">
                    <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder={isAuthenticated ? "댓글을 입력하세요..." : "로그인 후 댓글을 입력해주세요"}
                        disabled={!isAuthenticated}
                        className="flex-1 px-6 py-4 bg-gray-100 rounded-2xl font-medium text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    />
                    <button
                        onClick={handleCommentSubmit}
                        disabled={!isAuthenticated || commentLoading || !commentInput.trim()}
                        className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {commentLoading ? '...' : '등록'}
                    </button>
                </div>

                {/* Comment List */}
                <div className="flex flex-col gap-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="font-bold">아직 댓글이 없습니다</p>
                            <p className="text-sm">첫 번째 댓글을 남겨보세요!</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4 p-6 bg-gray-50 rounded-2xl">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {comment.authorNickname?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-black">{comment.authorNickname || '익명'}</span>
                                        <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
