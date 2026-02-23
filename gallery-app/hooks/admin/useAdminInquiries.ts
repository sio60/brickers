"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Inquiry } from "@/components/admin/InquiriesTab";

const createdAtTime = (createdAt?: string) => {
    if (!createdAt) return 0;
    const time = new Date(createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const sortInquiriesByPendingAnswer = (items: Inquiry[]) => {
    return [...items].sort((a, b) => {
        const aPending = !a.answer?.content?.trim();
        const bPending = !b.answer?.content?.trim();
        if (aPending !== bPending) return aPending ? -1 : 1;
        return createdAtTime(a.createdAt) - createdAtTime(b.createdAt);
    });
};

export function useAdminInquiries() {
    const { authFetch } = useAuth();

    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

    const fetchInquiries = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/inquiries?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(sortInquiriesByPendingAnswer(data.content || []));
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchInquiries();
    }, [fetchInquiries]);

    const handleAnswerSubmit = async (inquiryId: string) => {
        const content = answerTexts[inquiryId];
        if (!content?.trim()) return;
        try {
            const res = await authFetch(`/api/admin/inquiries/${inquiryId}/answer`, {
                method: "POST",
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [inquiryId]: "" }));
                fetchInquiries();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        inquiries,
        answerTexts,
        setAnswerTexts,
        handleAnswerSubmit,
    };
}
