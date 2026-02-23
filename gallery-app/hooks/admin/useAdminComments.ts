"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Comment } from "@/components/admin/CommentsTab";

export function useAdminComments() {
    const { authFetch } = useAuth();

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentPage, setCommentPage] = useState(0);
    const [commentTotalPages, setCommentTotalPages] = useState(0);

    const fetchComments = useCallback(async () => {
        try {
            const res = await authFetch(`/api/admin/comments?page=${commentPage}&size=20&sort=createdAt,desc`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.content || []);
                setCommentTotalPages(data.totalPages || 0);
            }
        } catch (error) {
            console.error("Failed to fetch comments", error);
        }
    }, [authFetch, commentPage]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            const res = await authFetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted: true } : c));
            }
        } catch (error) {
            console.error("Error deleting comment", error);
        }
    };

    return {
        comments,
        commentPage,
        setCommentPage,
        commentTotalPages,
        fetchComments,
        handleDeleteComment,
    };
}
