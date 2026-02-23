import React, { ChangeEvent } from "react";
import { useAdminRefunds } from "@/hooks/admin/useAdminRefunds";
import { useLanguage } from "@/contexts/LanguageContext";

export interface RefundRequest {
    id: string;
    orderId: string;
    orderNo: string;
    amount: number;
    status: string;
    requestedAt: string;
    userId: string;
    itemName?: string;
    cancelReason?: string;
    createdAt: string;
    updatedAt: string;
}

export default function RefundsTab() {
    const { t } = useLanguage();
    const {
        refunds,
        answerTexts,
        setAnswerTexts,
        handleRefundApprove,
        handleRefundReject,
    } = useAdminRefunds();

    const statusBadgeClass = (status: string) => {
        const base = "px-3 py-1 rounded text-[11px] font-extrabold uppercase border border-black";
        if (status === "OPEN" || status === "PENDING") return `${base} bg-white text-black`;
        if (status === "ANSWERED" || status === "RESOLVED") return `${base} bg-black text-white`;
        if (status === "CLOSED" || status === "REJECTED") return `${base} bg-[#eee] text-[#666] border-[#ddd]`;
        return base;
    };

    return (
        <div className="flex flex-col border-t-2 border-black">
            {refunds.map(item => (
                <div key={item.id} className="flex flex-col gap-4 py-6 px-2 bg-white border-b border-[#eee] transition-colors hover:bg-[#fcfcfc]">
                    <div className="[&_h4]:m-0 [&_h4]:mb-3 [&_h4]:flex [&_h4]:items-center [&_h4]:justify-between [&_h4]:text-base [&_h4]:font-extrabold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[#444] [&_p]:m-0">
                        <h4>
                            {t.admin.refund.orderNo}: {item.orderNo}
                            <span className={statusBadgeClass(item.status)}>
                                {item.status}
                            </span>
                        </h4>
                        <p>
                            {item.itemName && <><strong>{t.admin.refund.planName}:</strong> {item.itemName}<br /></>}
                            <strong>{t.admin.refund.amount}:</strong> {item.amount?.toLocaleString()}
                        </p>
                        {item.cancelReason && (
                            <p><strong>{t.admin.refund.reason}:</strong> {item.cancelReason}</p>
                        )}
                        <div className="text-xs text-[#999] mt-2">
                            {t.admin.refund.user}: {item.userId} • {t.admin.refund.requestDate}: {new Date(item.requestedAt).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="pt-4 mt-0 border-t border-dashed border-[#eee]">
                        <div className="flex flex-col gap-3 [&_textarea]:w-full [&_textarea]:min-h-[100px] [&_textarea]:p-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black [&_textarea]:font-[inherit] [&_textarea]:text-sm [&_textarea]:resize-none [&_textarea]:bg-white focus:[&_textarea]:outline-none focus:[&_textarea]:shadow-none focus:[&_textarea]:border-[#ffe135] [&_button]:py-2.5 [&_button]:px-6 [&_button]:bg-black [&_button]:text-white [&_button]:border-none [&_button]:rounded-lg [&_button]:text-[13px] [&_button]:font-extrabold [&_button]:cursor-pointer [&_button]:transition-all [&_button]:duration-200 hover:[&_button]:-translate-y-0.5 hover:[&_button]:bg-[#ffe135] hover:[&_button]:text-black">
                            <textarea
                                placeholder={t.admin.refund.rejectReason}
                                value={answerTexts[item.orderId] || ""}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAnswerTexts(prev => ({ ...prev, [item.orderId]: e.target.value }))}
                            />
                            <div className="flex gap-2 self-end">
                                <button
                                    className="!bg-[#eee] !text-black"
                                    onClick={() => handleRefundReject(item.orderId)}
                                >
                                    {t.admin.refund.reject}
                                </button>
                                <button onClick={() => handleRefundApprove(item.orderId)}>
                                    {t.admin.refund.approve}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {refunds.length === 0 && <p className="text-center text-[#999] py-10 text-sm">{t.admin.refund.empty}</p>}
        </div>
    );
}
