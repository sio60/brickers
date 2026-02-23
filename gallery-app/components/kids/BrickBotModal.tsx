'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./BrickBotModal.module.css";

import { CHAT_TRANSLATIONS } from "./brickbot/translations";
import ChatView, { type ActionType, type Message } from "./brickbot/ChatView";
import InquiryForm from "./brickbot/InquiryForm";
import ReportForm from "./brickbot/ReportForm";
import RefundForm from "./brickbot/RefundForm";

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateAction?: () => void;
}

type ChatSessionState = {
    conversationId: string | null;
    messages: Message[];
    updatedAt: number;
};

const MAX_CONTEXT_MESSAGES = 30;
const CHAT_SESSION_TTL_MS = 30 * 60 * 1000;

export default function BrickBotModal({ isOpen, onClose, onCreateAction }: BrickBotModalProps) {
    const router = useRouter();
    const { language } = useLanguage();
    const tChat = CHAT_TRANSLATIONS[language as keyof typeof CHAT_TRANSLATIONS] || CHAT_TRANSLATIONS.ko;
    const { isAuthenticated, authFetch, user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: tChat.welcome },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userSessionKey = isAuthenticated
        ? String(user?.id ?? user?.email ?? "auth")
        : "guest";
    const chatSessionStorageKey = `brickerbot:chat:${userSessionKey}:${language}`;

    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && prev[0].role === "bot" && prev[0].content !== tChat.welcome) {
                return [{ role: "bot", content: tChat.welcome }];
            }
            return prev;
        });
    }, [language, tChat.welcome]);

    const suggestedQuestions = [
        tChat.suggestions.howTo,
        tChat.suggestions.gallery,
        tChat.suggestions.inquiry,
        tChat.suggestions.report,
        tChat.suggestions.refund,
    ];

    const [mode, setMode] = useState<"CHAT" | "INQUIRY" | "REPORT" | "REFUND">("CHAT");
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [reportReason, setReportReason] = useState("SPAM");
    const [refundList, setRefundList] = useState<any[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // === Session persistence ===

    useEffect(() => {
        if (!isOpen) return;
        try {
            const raw = sessionStorage.getItem(chatSessionStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as ChatSessionState;
            const isExpired = !parsed?.updatedAt || (Date.now() - parsed.updatedAt > CHAT_SESSION_TTL_MS);
            if (isExpired) { sessionStorage.removeItem(chatSessionStorageKey); return; }
            if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
                setMessages(trimMessages(parsed.messages));
            } else {
                setMessages([{ role: "bot", content: tChat.welcome }]);
            }
            setConversationId(parsed.conversationId ?? null);
        } catch { sessionStorage.removeItem(chatSessionStorageKey); }
    }, [isOpen, chatSessionStorageKey, tChat.welcome]);

    useEffect(() => {
        if (!isOpen || mode !== "CHAT") return;
        const state: ChatSessionState = { conversationId, messages: trimMessages(messages), updatedAt: Date.now() };
        sessionStorage.setItem(chatSessionStorageKey, JSON.stringify(state));
    }, [isOpen, mode, chatSessionStorageKey, conversationId, messages]);

    useEffect(() => {
        if (isOpen && mode === "CHAT") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen, mode]);

    // === Helpers ===

    const trimMessages = (next: Message[]) => next.slice(-MAX_CONTEXT_MESSAGES);

    const actionFromName = (name: string): ActionType | null => {
        const map: Record<string, ActionType> = { create: "create", gallery: "gallery", mypage: "mypage", inquiries: "inquiries", reports: "reports", refunds: "refunds", jobs: "jobs" };
        return map[name.trim().toLowerCase()] ?? null;
    };

    const actionFromTarget = (target?: string | null): ActionType | null => {
        if (!target) return null;
        const n = target.trim().toLowerCase();
        if (n === "/kids/main") return "create";
        if (n === "/gallery") return "gallery";
        if (n === "/mypage") return "mypage";
        if (n === "/mypage?menu=inquiries") return "inquiries";
        if (n === "/mypage?menu=reports") return "reports";
        if (n === "/mypage?menu=refunds") return "refunds";
        if (n === "/mypage?menu=jobs") return "jobs";
        return null;
    };

    const parseStructuredActions = (rawActions: unknown): ActionType[] => {
        if (!Array.isArray(rawActions)) return [];
        const parsed: ActionType[] = [];
        for (const item of rawActions) {
            if (typeof item === "string") {
                const action = actionFromName(item) ?? actionFromTarget(item);
                if (action) parsed.push(action);
                continue;
            }
            if (item && typeof item === "object") {
                const obj = item as Record<string, unknown>;
                const fromName = typeof obj.action === "string" ? actionFromName(obj.action)
                    : typeof obj.name === "string" ? actionFromName(obj.name) : null;
                const action = fromName ?? (typeof obj.target === "string" ? actionFromTarget(obj.target) : null);
                if (action) parsed.push(action);
            }
        }
        return parsed;
    };

    const parseBotResponse = (text: string, rawActions?: unknown): { cleanText: string, actions: ActionType[] } => {
        const tokenMap: Record<string, ActionType> = {
            "{{NAV_CREATE}}": "create", "{{NAV_GALLERY}}": "gallery", "{{NAV_MYPAGE}}": "mypage",
            "{{NAV_INQUIRIES}}": "inquiries", "{{NAV_REPORTS}}": "reports", "{{NAV_REFUNDS}}": "refunds", "{{NAV_JOBS}}": "jobs",
        };
        const actions: ActionType[] = [...parseStructuredActions(rawActions)];
        let cleanText = text || "";
        for (const [token, action] of Object.entries(tokenMap)) {
            if (cleanText.includes(token)) { actions.push(action); cleanText = cleanText.replaceAll(token, ""); }
        }
        cleanText = cleanText.replace(/\{\{NAV:([^}]+)\}\}/g, (_, target: string) => {
            const action = actionFromTarget(target);
            if (action) actions.push(action);
            return "";
        });
        return { cleanText: cleanText.trim(), actions: Array.from(new Set(actions)) };
    };

    // === Handlers ===

    const handleActionClick = (action: ActionType) => {
        if (!action) return;
        onClose();
        const routes: Record<ActionType, string> = {
            create: "/kids/main", gallery: "/gallery", mypage: "/mypage",
            inquiries: "/mypage?menu=inquiries", reports: "/mypage?menu=reports",
            refunds: "/mypage?menu=refunds", jobs: "/mypage?menu=jobs",
        };
        if (action === "create" && onCreateAction) { onCreateAction(); return; }
        router.push(routes[action]);
    };

    const getActionLabel = (action: ActionType) => {
        const labels: Record<string, string> = {
            create: tChat.actions.create, gallery: tChat.actions.gallery, mypage: tChat.actions.mypage,
            inquiries: "My Inquiries", reports: "My Reports", refunds: "My Refunds", jobs: "My Jobs",
        };
        return labels[action] || action;
    };

    const handleSuggestionClick = (q: string) => {
        if (q === tChat.suggestions.inquiry) { setMode("INQUIRY"); setFormTitle(""); setFormContent(""); }
        else if (q === tChat.suggestions.report) { setMode("REPORT"); setFormContent(""); setReportReason("SPAM"); }
        else if (q === tChat.suggestions.refund) { setMode("REFUND"); fetchPaymentHistory(); }
        else { setInput(q); }
    };

    const fetchPaymentHistory = async () => {
        try {
            setIsLoading(true);
            if (!isAuthenticated) { alert(tChat.loginRequired); setMode("CHAT"); return; }
            const res = await authFetch("/api/payments/my/history?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setRefundList((data.content || []).filter((o: any) => o.status === "PENDING" || o.status === "COMPLETED"));
            } else { alert(tChat.loadFailed); setMode("CHAT"); }
        } catch (e) { console.error(e); setMode("CHAT"); } finally { setIsLoading(false); }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input;
        setMessages((prev) => trimMessages([...prev, { role: "user", content: userMsg }]));
        setInput(""); setIsLoading(true); setShowSuggestions(false);
        try {
            const res = await authFetch("/api/chat/query", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, language, conversation_id: conversationId }),
            });
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            if (data.conversation_id) setConversationId(data.conversation_id);
            const { cleanText, actions } = parseBotResponse(data.reply, data.actions);
            setMessages((prev) => trimMessages([...prev, { role: "bot", content: cleanText, actions: actions.length > 0 ? actions : undefined }]));
        } catch {
            setMessages((prev) => trimMessages([...prev, { role: "bot", content: tChat.error }]));
        } finally { setIsLoading(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const submitInquiry = async () => {
        if (!formTitle.trim() || !formContent.trim()) return alert(tChat.inputRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) { alert(tChat.loginRequired); setIsSubmitting(false); return; }
        try {
            const res = await authFetch("/api/inquiries", { method: "POST", body: JSON.stringify({ title: formTitle, content: formContent }) });
            if (res.ok) { setMode("CHAT"); setMessages(prev => [...prev, { role: "bot", content: tChat.inquiry.confirm }]); }
            else { alert(tChat.submitFailed); }
        } catch { alert(tChat.error); } finally { setIsSubmitting(false); }
    };

    const submitReport = async () => {
        if (!formContent.trim()) return alert(tChat.inputRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) { alert(tChat.loginRequired); setIsSubmitting(false); return; }
        try {
            const res = await authFetch("/api/reports", { method: "POST", body: JSON.stringify({ targetType: "GENERAL", targetId: "0", reason: reportReason, details: formContent }) });
            if (res.ok) { setMode("CHAT"); setMessages(prev => [...prev, { role: "bot", content: tChat.report.confirm }]); }
            else { alert(tChat.submitFailed); }
        } catch { alert(tChat.error); } finally { setIsSubmitting(false); }
    };

    const submitRefund = async () => {
        if (!selectedOrderId) return alert(tChat.selectRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) { alert(tChat.loginRequired); setIsSubmitting(false); return; }
        try {
            const res = await authFetch(`/api/payments/orders/${selectedOrderId}/cancel`, { method: "POST" });
            if (res.ok) { setMode("CHAT"); setSelectedOrderId(null); setMessages(prev => [...prev, { role: "bot", content: tChat.refund.confirm }]); }
            else if (res.status === 409) { alert(tChat.refund.alreadyProcessed); setSelectedOrderId(null); fetchPaymentHistory(); }
            else { alert(tChat.submitFailed); }
        } catch { alert(tChat.error); } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.profile}>
                        <span className={styles.name}>
                            {tChat.header} {mode !== "CHAT" && ` - ${mode === "INQUIRY" ? tChat.suggestions.inquiry : mode === "REPORT" ? tChat.suggestions.report : tChat.suggestions.refund}`}
                        </span>
                    </div>
                    <button className={styles.close} onClick={onClose}>&times;</button>
                </div>

                {mode === "CHAT" ? (
                    <ChatView
                        tChat={tChat}
                        messages={messages}
                        input={input}
                        setInput={setInput}
                        isLoading={isLoading}
                        showSuggestions={showSuggestions}
                        setShowSuggestions={setShowSuggestions}
                        suggestedQuestions={suggestedQuestions}
                        onSuggestionClick={handleSuggestionClick}
                        onSend={handleSend}
                        onKeyDown={handleKeyDown}
                        onActionClick={handleActionClick}
                        getActionLabel={getActionLabel}
                        messagesEndRef={messagesEndRef}
                    />
                ) : (
                    <div className={styles.formContainer}>
                        {mode === "INQUIRY" && (
                            <InquiryForm tChat={tChat} formTitle={formTitle} setFormTitle={setFormTitle}
                                formContent={formContent} setFormContent={setFormContent}
                                isSubmitting={isSubmitting} onSubmit={submitInquiry} onCancel={() => setMode("CHAT")} />
                        )}
                        {mode === "REPORT" && (
                            <ReportForm tChat={tChat} formContent={formContent} setFormContent={setFormContent}
                                reportReason={reportReason} setReportReason={setReportReason}
                                isSubmitting={isSubmitting} onSubmit={submitReport} onCancel={() => setMode("CHAT")} />
                        )}
                        {mode === "REFUND" && (
                            <RefundForm tChat={tChat} refundList={refundList} selectedOrderId={selectedOrderId}
                                setSelectedOrderId={setSelectedOrderId}
                                isSubmitting={isSubmitting} onSubmit={submitRefund} onCancel={() => setMode("CHAT")} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
