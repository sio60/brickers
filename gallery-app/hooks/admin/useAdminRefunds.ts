"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { RefundRequest } from "@/components/admin/RefundsTab";

export function useAdminRefunds() {
    const { authFetch } = useAuth();
    const { t } = useLanguage();

    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

    const fetchRefunds = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/payments/refund-requests?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                const mapped = (data.content || []).map((item: any) => ({
                    id: item.id,
                    orderId: item.id,
                    orderNo: item.orderNo || item.id,
                    amount: item.amount,
                    status: item.status,
                    requestedAt: item.updatedAt || item.createdAt,
                    userId: item.userId,
                    itemName: item.itemName,
                    cancelReason: item.cancelReason,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                }));
                setRefunds(mapped);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleRefundApprove = async (orderId: string) => {
        if (!confirm(t.admin.refund.confirmApprove)) return;
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/approve-refund`, { method: "POST", body: JSON.stringify({}) });
            if (res.ok) fetchRefunds();
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefundReject = async (orderId: string) => {
        const reason = answerTexts[orderId];
        if (!reason?.trim()) return;
        try {
            const res = await authFetch(`/api/admin/payments/orders/${orderId}/reject-refund`, { method: "POST", body: JSON.stringify({ reason }) });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [orderId]: "" }));
                fetchRefunds();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        refunds,
        answerTexts,
        setAnswerTexts,
        handleRefundApprove,
        handleRefundReject,
    };
}
