'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as gtag from '@/lib/gtag';
import { GalleryItem } from '@/types/gallery';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";

const Viewer3D = dynamic(() => import('./Viewer3D'), { ssr: false });
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import ScreenshotGallery from './gallery/ScreenshotGallery';
import { CommentList, CommentInput, Comment } from './gallery/CommentSection';
import RecommendationSidebar from './gallery/RecommendationSidebar';

// GLB 모델 중심 정렬 컴포넌트 (BrickJudgeViewer 패턴)
function GlbModel({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    const { invalidate, camera, controls } = useThree();
    const centered = useRef(false);

    useEffect(() => {
        if (!scene || centered.current) return;

        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        // 모델 중심을 원점에 배치 (바닥이 아닌 전체 중심)
        scene.position.set(-center.x, -center.y, -center.z);

        if (controls && (controls as any).target) {
            (controls as any).target.set(0, 0, 0);
            (controls as any).update();
        }
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(0, maxDim * 0.3, maxDim * 2.5);
        camera.lookAt(0, 0, 0);

        centered.current = true;
        invalidate();
    }, [scene, camera, controls, invalidate]);

    return <primitive object={scene} />;
}

type Props = {
    item: GalleryItem;
};

export default function GalleryDetailClient({ item }: Props) {
    const { t } = useLanguage();
    const router = useRouter();
    const { user, isAuthenticated, authFetch } = useAuth();

    // Interaction State
    const [likeCount, setLikeCount] = useState(item.likeCount || 0);
    const [commentCount, setCommentCount] = useState(item.commentCount || 0);
    const [isLiked, setIsLiked] = useState(item.myReaction === 'LIKE');
    const [isBookmarked, setIsBookmarked] = useState(item.bookmarked || false);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    // Toast State
    const [showToast, setShowToast] = useState(false);

    // View State
    const [activeTab, setActiveTab] = useState<'LDR' | 'GLB' | 'IMG'>('IMG');

    // Screenshot check
    const hasScreenshots = item.screenshotUrls && Object.keys(item.screenshotUrls).length > 0;

    // Recommendations State
    const [recommendations, setRecommendations] = useState<GalleryItem[]>([]);

    useEffect(() => {
        // Function to fetch comments
        const fetchComments = async () => {
            try {
                const res = await fetch(`/api/gallery/${item.id}/comments?page=0&size=100`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data.content || []);
                }
            } catch (error) { console.error("[Comments] Fetch error:", error); }
        };

        // Initial fetch
        fetchComments();

        // Fetch detail for latest like state
        const fetchDetail = async () => {
            try {
                const res = await authFetch(`/api/gallery/${item.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.likeCount !== undefined) setLikeCount(data.likeCount);
                    if (data.commentCount !== undefined) setCommentCount(data.commentCount);
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

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id, isAuthenticated]);

    const handleLikeToggle = async () => {
        if (!isAuthenticated) return alert(t.common.loginRequired);
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
                if (data.likeCount !== undefined) setLikeCount(data.likeCount);

                gtag.event({
                    action: 'toggle_reaction',
                    category: 'Engagement',
                    label: newLiked ? 'like' : 'unlike'
                });
            }
        } catch (error) { console.error(error); }
    };

    const handleBookmarkToggle = async () => {
        if (!isAuthenticated) return alert(t.common.loginRequired);
        try {
            const res = await authFetch(`/api/gallery/${item.id}/bookmark`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                const newBookmarked = data.bookmarked !== undefined ? data.bookmarked : !isBookmarked;
                setIsBookmarked(newBookmarked);

                gtag.event({
                    action: 'toggle_bookmark',
                    category: 'Engagement',
                    label: newBookmarked ? 'save' : 'unsave'
                });
            }
        } catch (error) { console.error(error); }
    };

    const handleCommentSubmit = async (parentId?: string, replyContent?: string) => {
        if (!isAuthenticated) return alert(t.common.loginRequired);

        const content = parentId ? (replyContent || '') : commentInput;
        if (!content.trim()) return;

        setCommentLoading(true);

        try {
            const res = await authFetch(`/api/gallery/${item.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parentId }),
            });
            if (res.ok) {
                const newComment = await res.json();

                // Recursive update function to find parent and append child
                const updateCommentsRecursive = (list: Comment[]): Comment[] => {
                    return list.map(c => {
                        if (c.id === parentId) {
                            return { ...c, children: [...(c.children || []), newComment] };
                        }
                        if (c.children && c.children.length > 0) {
                            return { ...c, children: updateCommentsRecursive(c.children) };
                        }
                        return c;
                    });
                };

                if (parentId) {
                    setComments(prev => updateCommentsRecursive(prev));
                    setCommentCount(prev => prev + 1);
                } else {
                    setComments(prev => [newComment, ...prev]);
                    setCommentCount(prev => prev + 1);
                    setCommentInput('');
                }

                gtag.event({
                    action: 'post_comment',
                    category: 'Engagement',
                    label: parentId ? 'reply' : 'new'
                });
            }
        } catch (error) { console.error(error); }
        finally {
            setCommentLoading(false);
        }
    };

    // [New] Comment Delete Handler
    const handleCommentDelete = async (commentId: string) => {
        // Optimistic UI update or wait for server? Wait for server is safer.
        try {
            const res = await authFetch(`/api/gallery/${item.id}/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove from state
                const removeCommentRecursive = (list: Comment[]): Comment[] => {
                    return list.filter(c => c.id !== commentId)
                        .map(c => ({
                            ...c,
                            children: c.children ? removeCommentRecursive(c.children) : c.children
                        }));
                };

                setComments(prev => removeCommentRecursive(prev));
                setCommentCount(prev => Math.max(0, prev - 1)); // Decrement count
            } else {
                alert("Failed to delete comment.");
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting comment.");
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
            gtag.event({ action: 'share_gallery', category: 'Engagement', label: item.id });
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert(t.detail?.copyFailed || 'Failed to copy URL.');
        }
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

                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="text-left px-8 py-4 transition-all font-medium flex items-center gap-3 bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                    >
                        ← {t.kids.steps.back}
                    </button>
                </div>
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
                            hasScreenshots ? (
                                <ScreenshotGallery item={item} />
                            ) : item.ldrUrl ? (
                                <Viewer3D url={item.ldrUrl} />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold">
                                    LDR Model Not Available
                                </div>
                            )
                        )}

                        {activeTab === 'GLB' && (
                            item.glbUrl ? (
                                <div className="absolute inset-0">
                                    <Canvas camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }} dpr={[1, 2]} frameloop="demand">
                                        <ThrottledDriver />
                                        <ambientLight intensity={0.8} />
                                        <directionalLight position={[5, 10, 5]} intensity={1.5} />
                                        <Environment preset="city" />
                                        <GlbModel url={item.glbUrl} />
                                        <OrbitControls makeDefault enablePan={false} enableZoom autoRotate autoRotateSpeed={2} />
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
                                            className="object-contain"
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
                <div className="w-[350px] bg-white border-l border-gray-200 flex flex-col shrink-0 relative z-10 select-none">
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* User Info Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            {item.authorProfileImage ? (
                                <img src={item.authorProfileImage} alt={item.authorNickname || ''} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm">
                                    {item.authorNickname ? item.authorNickname[0].toUpperCase() : '?'}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900">@{item.authorNickname || t.common.anonymous}</span>
                                <span className="text-[10px] text-gray-500 font-semibold tracking-wide">{t.detail.creator}</span>
                            </div>
                        </div>

                        {/* Title & Actions */}
                        <div className="p-6">
                            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-6">{item.title}</h1>

                            {/* Tags Section */}
                            {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {item.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full tracking-wide"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

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
                                    onClick={handleShare}
                                    className="flex flex-col items-center gap-1 group transition-all ml-auto relative"
                                >
                                    <div className="flex items-center justify-center transition-all">
                                        <Image src="/icons/share.png" alt="Share" width={22} height={22} className="opacity-60" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">{t.detail.share}</span>

                                    {/* Toast Notification */}
                                    {showToast && (
                                        <div className="absolute top-12 right-0 bg-gray-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg whitespace-nowrap z-50 animate-fade-in-up">
                                            {t.detail?.copied || 'URL copied'}
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <CommentList
                            comments={comments}
                            commentCount={commentCount}
                            isAuthenticated={isAuthenticated}
                            currentUser={user as any}
                            onCommentSubmit={handleCommentSubmit}
                            onCommentDelete={handleCommentDelete}
                            t={t}
                        />
                    </div>

                    {/* Comment Input (fixed at bottom) */}
                    <CommentInput
                        commentInput={commentInput}
                        commentLoading={commentLoading}
                        isAuthenticated={isAuthenticated}
                        onCommentInputChange={setCommentInput}
                        onCommentSubmit={handleCommentSubmit}
                        t={t}
                    />
                </div>

                {/* 4. Recommendation Sidebar */}
                <RecommendationSidebar recommendations={recommendations} t={t} />
            </div>
        </div>
    );
}
