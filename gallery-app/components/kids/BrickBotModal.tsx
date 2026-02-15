'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./BrickBotModal.module.css";

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateAction?: () => void;
}

interface Message {
    role: "user" | "bot";
    content: string;
    actions?: ActionType[];
}

type ActionType =
    | "create"
    | "gallery"
    | "mypage"
    | "inquiries"
    | "reports"
    | "refunds"
    | "jobs";

type ChatSessionState = {
    conversationId: string | null;
    messages: Message[];
    updatedAt: number;
};

const MAX_CONTEXT_MESSAGES = 30;
const CHAT_SESSION_TTL_MS = 30 * 60 * 1000;

const CHAT_TRANSLATIONS = {
    ko: {
        welcome: "안녕하세요! 궁금한 점이 있으신가요?",
        suggestions: {
            howTo: "브릭 어떻게 만들어요?",
            gallery: "갤러리는 뭐예요?",
            inquiry: "문의하기",
            report: "신고하기",
            refund: "환불 요청"
        },
        toggleSuggestions: "이런 질문을 해보세요",
        toggleSuggestionsAfter: "다른 질문은 있으신가요?",
        placeholder: "궁금한 내용을 입력하세요...",
        send: "전송",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 문의하기",
            titlePlace: "문의 제목",
            contentPlace: "문의 내용을 자세히 적어주세요.",
            btn: "문의 접수",
            confirm: "문의가 접수되었습니다! 관리자가 확인 후 빠르게 답변드리겠습니다."
        },
        report: {
            modeTitle: "신고하기",
            reasonLabel: "신고 사유",
            contentPlace: "신고 내용을 적어주세요.",
            btn: "신고 접수",
            confirm: "신고가 접수되었습니다. 관리자가 검토 후 조치하겠습니다.",
            reasons: {
                SPAM: "스팸 / 부적절한 홍보",
                INAPPROPRIATE: "부적절한 콘텐츠",
                ABUSE: "욕설 / 비하 발언",
                COPYRIGHT: "저작권 침해",
                OTHER: "기타"
            }
        },
        refund: {
            modeTitle: "환불 요청",
            desc: "최근 결제 내역 중 환불할 항목을 선택해주세요.",
            empty: "환불 가능한 결제 내역이 없습니다.",
            btn: "환불 요청",
            confirm: "환불 요청이 접수되었습니다. 처리 결과는 알림으로 알려드릴게요.",
            alreadyProcessed: "이미 처리된 주문입니다. 목록을 새로고침합니다."
        },
        cancel: "취소",
        actions: {
            create: "브릭 만들기 시작",
            gallery: "갤러리 구경하기",
            mypage: "내 정보 보기"
        },
        error: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요!",
        loginRequired: "로그인이 필요한 서비스입니다.",
        loadFailed: "데이터를 불러오는데 실패했습니다.",
        inputRequired: "입력 내용을 확인해주세요.",
        submitFailed: "접수에 실패했습니다.",
        selectRequired: "항목을 선택해주세요."
    },
    en: {
        welcome: "Hello! How can I help you today?",
        suggestions: {
            howTo: "How do I make Brick?",
            gallery: "What is Gallery?",
            inquiry: "Inquiry",
            report: "Report",
            refund: "Request Refund"
        },
        toggleSuggestions: "Suggested Questions",
        toggleSuggestionsAfter: "Do you have any other questions?",
        placeholder: "Ask me anything...",
        send: "Send",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 Inquiry",
            titlePlace: "Title",
            contentPlace: "Please describe your inquiry.",
            btn: "Submit Inquiry",
            confirm: "Inquiry submitted! We will get back to you soon."
        },
        report: {
            modeTitle: "Report Details",
            reasonLabel: "Reason",
            contentPlace: "Please describe the issue.",
            btn: "Submit Report",
            confirm: "Report submitted. We will review it shortly.",
            reasons: {
                SPAM: "Spam / Promotion",
                INAPPROPRIATE: "Inappropriate Content",
                ABUSE: "Abusive Language",
                COPYRIGHT: "Copyright Infringement",
                OTHER: "Other"
            }
        },
        refund: {
            modeTitle: "Request Refund",
            desc: "Select a payment to refund.",
            empty: "No refundable payments found.",
            btn: "Request Refund",
            confirm: "Refund request submitted.",
            alreadyProcessed: "This order has already been processed. Refreshing list."
        },
        cancel: "Cancel",
        actions: {
            create: "Start Creating",
            gallery: "Visit Gallery",
            mypage: "My Page"
        },
        error: "Sorry, something went wrong. Please try again!",
        loginRequired: "Login required.",
        loadFailed: "Failed to load data.",
        inputRequired: "Please check your input.",
        submitFailed: "Submission failed.",
        selectRequired: "Please select an item."
    },
    ja: {
        welcome: "こんにちは！何かお手伝いしましょうか？",
        suggestions: {
            howTo: "どうやってブリックを作るの？",
            gallery: "ギャラリーって何？",
            inquiry: "お問い合わせ",
            report: "通報する",
            refund: "返金リクエスト"
        },
        toggleSuggestions: "こんな質問はどうですか？",
        toggleSuggestionsAfter: "他に質問はありますか？",
        placeholder: "気になることを入力してください...",
        send: "送信",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 お問い合わせ",
            titlePlace: "タイトル",
            contentPlace: "お問い合わせ内容を詳しく書いてください。",
            btn: "送信する",
            confirm: "お問い合わせを受け付けました！確認後、すぐにお答えします。"
        },
        report: {
            modeTitle: "通報する",
            reasonLabel: "通報理由",
            contentPlace: "内容を書いてください。",
            btn: "通報する",
            confirm: "通報を受け付けました。管理者が確認して対応します。",
            reasons: {
                SPAM: "スパム / 不適切な宣伝",
                INAPPROPRIATE: "不適切なコンテンツ",
                ABUSE: "暴言 / 誹謗中傷",
                COPYRIGHT: "著作権侵害",
                OTHER: "その他"
            }
        },
        refund: {
            modeTitle: "返金リクエスト",
            desc: "返金したい決済を選択してください。",
            empty: "返金可能な決済がありません。",
            btn: "リクエスト",
            confirm: "返金リクエストを受け付けました。",
            alreadyProcessed: "すでに処理済みの注文です。リストを更新します。"
        },
        cancel: "キャンセル",
        actions: {
            create: "ブリックを作り始める",
            gallery: "ギャラリーを見る",
            mypage: "マイページ"
        },
        error: "申し訳ありません。問題が発生しました。もう一度お試しください！",
        loginRequired: "ログインが必要です。",
        loadFailed: "データの読み込みに失敗しました。",
        inputRequired: "入力内容を確認してください。",
        submitFailed: "送信に失敗しました。",
        selectRequired: "項目を選択してください。"
    }
};

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
        // We include all dependencies that were present before to avoid "size changed" error during HMR,
        // but we've used functional update to avoid the infinite loop with 'messages'.
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

    useEffect(() => {
        if (!isOpen) return;

        try {
            const raw = sessionStorage.getItem(chatSessionStorageKey);
            if (!raw) return;

            const parsed = JSON.parse(raw) as ChatSessionState;
            const isExpired = !parsed?.updatedAt || (Date.now() - parsed.updatedAt > CHAT_SESSION_TTL_MS);
            if (isExpired) {
                sessionStorage.removeItem(chatSessionStorageKey);
                return;
            }

            if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
                setMessages(trimMessages(parsed.messages));
            } else {
                setMessages([{ role: "bot", content: tChat.welcome }]);
            }

            setConversationId(parsed.conversationId ?? null);
        } catch {
            sessionStorage.removeItem(chatSessionStorageKey);
        }
    }, [isOpen, chatSessionStorageKey, tChat.welcome]);

    useEffect(() => {
        if (!isOpen) return;
        if (mode !== "CHAT") return;

        const state: ChatSessionState = {
            conversationId,
            messages: trimMessages(messages),
            updatedAt: Date.now(),
        };
        sessionStorage.setItem(chatSessionStorageKey, JSON.stringify(state));
    }, [isOpen, mode, chatSessionStorageKey, conversationId, messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && mode === "CHAT") scrollToBottom();
    }, [messages, isOpen, mode]);

    const trimMessages = (next: Message[]) => next.slice(-MAX_CONTEXT_MESSAGES);

    const actionFromName = (name: string): ActionType | null => {
        const normalized = name.trim().toLowerCase();
        const map: Record<string, ActionType> = {
            create: "create",
            gallery: "gallery",
            mypage: "mypage",
            inquiries: "inquiries",
            reports: "reports",
            refunds: "refunds",
            jobs: "jobs",
        };
        return map[normalized] ?? null;
    };

    const actionFromTarget = (target?: string | null): ActionType | null => {
        if (!target) return null;
        const normalized = target.trim().toLowerCase();
        if (normalized === "/kids/main") return "create";
        if (normalized === "/gallery") return "gallery";
        if (normalized === "/mypage") return "mypage";
        if (normalized === "/mypage?menu=inquiries") return "inquiries";
        if (normalized === "/mypage?menu=reports") return "reports";
        if (normalized === "/mypage?menu=refunds") return "refunds";
        if (normalized === "/mypage?menu=jobs") return "jobs";
        return null;
    };

    const parseStructuredActions = (rawActions: unknown): ActionType[] => {
        if (!Array.isArray(rawActions)) return [];
        const parsed: ActionType[] = [];

        for (const item of rawActions) {
            if (typeof item === "string") {
                const fromName = actionFromName(item);
                const fromTarget = actionFromTarget(item);
                const action = fromName ?? fromTarget;
                if (action) parsed.push(action);
                continue;
            }

            if (item && typeof item === "object") {
                const obj = item as Record<string, unknown>;
                const fromName = typeof obj.action === "string"
                    ? actionFromName(obj.action)
                    : typeof obj.name === "string"
                        ? actionFromName(obj.name)
                        : null;
                const fromTarget = typeof obj.target === "string" ? actionFromTarget(obj.target) : null;
                const action = fromName ?? fromTarget;
                if (action) parsed.push(action);
            }
        }

        return parsed;
    };

    const parseBotResponse = (text: string, rawActions?: unknown): { cleanText: string, actions: ActionType[] } => {
        const tokenMap: Record<string, ActionType> = {
            "{{NAV_CREATE}}": "create",
            "{{NAV_GALLERY}}": "gallery",
            "{{NAV_MYPAGE}}": "mypage",
            "{{NAV_INQUIRIES}}": "inquiries",
            "{{NAV_REPORTS}}": "reports",
            "{{NAV_REFUNDS}}": "refunds",
            "{{NAV_JOBS}}": "jobs",
        };

        const actions: ActionType[] = [...parseStructuredActions(rawActions)];
        let cleanText = text || "";

        for (const [token, action] of Object.entries(tokenMap)) {
            if (cleanText.includes(token)) {
                actions.push(action);
                cleanText = cleanText.replaceAll(token, "");
            }
        }

        const dynamicNavPattern = /\{\{NAV:([^}]+)\}\}/g;
        cleanText = cleanText.replace(dynamicNavPattern, (_, target: string) => {
            const action = actionFromTarget(target);
            if (action) actions.push(action);
            return "";
        });

        const dedupedActions = Array.from(new Set(actions));
        return { cleanText: cleanText.trim(), actions: dedupedActions };
    };

    const handleActionClick = (action: ActionType) => {
        if (!action) return;
        onClose();
        switch (action) {
            case "create":
                if (onCreateAction) {
                    onCreateAction();
                } else {
                    router.push("/kids/main");
                }
                break;
            case "gallery":
                router.push("/gallery");
                break;
            case "mypage":
                router.push("/mypage");
                break;
            case "inquiries":
                router.push("/mypage?menu=inquiries");
                break;
            case "reports":
                router.push("/mypage?menu=reports");
                break;
            case "refunds":
                router.push("/mypage?menu=refunds");
                break;
            case "jobs":
                router.push("/mypage?menu=jobs");
                break;
        }
    };

    const getActionLabel = (action: ActionType) => {
        switch (action) {
            case "create":
                return tChat.actions.create;
            case "gallery":
                return tChat.actions.gallery;
            case "mypage":
                return tChat.actions.mypage;
            case "inquiries":
                return "My Inquiries";
            case "reports":
                return "My Reports";
            case "refunds":
                return "My Refunds";
            case "jobs":
                return "My Jobs";
        }
    };

    const handleSuggestionClick = (q: string) => {
        if (q === tChat.suggestions.inquiry) {
            setMode("INQUIRY");
            setFormTitle("");
            setFormContent("");
        } else if (q === tChat.suggestions.report) {
            setMode("REPORT");
            setFormContent("");
            setReportReason("SPAM");
        } else if (q === tChat.suggestions.refund) {
            setMode("REFUND");
            fetchPaymentHistory();
        } else {
            setInput(q);
        }
    };

    const fetchPaymentHistory = async () => {
        try {
            setIsLoading(true);
            if (!isAuthenticated) {
                alert(tChat.loginRequired);
                setMode("CHAT");
                return;
            }
            const res = await authFetch("/api/payments/my/history?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                const cancelable = (data.content || []).filter(
                    (o: any) => o.status === "PENDING" || o.status === "COMPLETED"
                );
                setRefundList(cancelable);
            } else {
                alert(tChat.loadFailed);
                setMode("CHAT");
            }
        } catch (e) {
            console.error(e);
            setMode("CHAT");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setMessages((prev) => trimMessages([...prev, { role: "user", content: userMsg }]));
        setInput("");
        setIsLoading(true);
        setShowSuggestions(false);

        try {
            const res = await authFetch("/api/chat/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    language,
                    conversation_id: conversationId,
                }),
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();
            if (data.conversation_id) setConversationId(data.conversation_id);
            const { cleanText, actions } = parseBotResponse(data.reply, data.actions);
            setMessages((prev) => trimMessages([
                ...prev,
                { role: "bot", content: cleanText, actions: actions.length > 0 ? actions : undefined },
            ]));

        } catch (e) {
            setMessages((prev) => trimMessages([
                ...prev,
                { role: "bot", content: tChat.error },
            ]));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const submitInquiry = async () => {
        if (!formTitle.trim() || !formContent.trim()) return alert(tChat.inputRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) {
            alert(tChat.loginRequired);
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await authFetch("/api/inquiries", {
                method: "POST",
                body: JSON.stringify({ title: formTitle, content: formContent }),
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: tChat.inquiry.confirm }]);
            } else {
                alert(tChat.submitFailed);
            }
        } catch (e) {
            alert(tChat.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitReport = async () => {
        if (!formContent.trim()) return alert(tChat.inputRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) {
            alert(tChat.loginRequired);
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await authFetch("/api/reports", {
                method: "POST",
                body: JSON.stringify({
                    targetType: "GENERAL",
                    targetId: "0",
                    reason: reportReason,
                    details: formContent
                }),
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: tChat.report.confirm }]);
            } else {
                alert(tChat.submitFailed);
            }
        } catch (e) {
            alert(tChat.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitRefund = async () => {
        if (!selectedOrderId) return alert(tChat.selectRequired);
        setIsSubmitting(true);
        if (!isAuthenticated) {
            alert(tChat.loginRequired);
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await authFetch(`/api/payments/orders/${selectedOrderId}/cancel`, {
                method: "POST",
            });
            if (res.ok) {
                setMode("CHAT");
                setSelectedOrderId(null);
                setMessages(prev => [...prev, { role: "bot", content: tChat.refund.confirm }]);
            } else if (res.status === 409) {
                alert(tChat.refund.alreadyProcessed);
                setSelectedOrderId(null);
                fetchPaymentHistory();
            } else {
                alert(tChat.submitFailed);
            }
        } catch (e) {
            alert(tChat.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className={styles.header}>
                    <div className={styles.profile}>
                        <span className={styles.name}>
                            {tChat.header} {mode !== "CHAT" && ` - ${mode === "INQUIRY" ? tChat.suggestions.inquiry : mode === "REPORT" ? tChat.suggestions.report : tChat.suggestions.refund}`}
                        </span>
                    </div>
                    <button className={styles.close} onClick={onClose}>×</button>
                </div>

                {/* 컨텐츠 */}
                {mode === "CHAT" ? (
                    <>
                        <div className={styles.messages}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`${styles.msgGroup} ${msg.role === "user" ? styles.user : styles.bot}`}>
                                    <div className={`${styles.msgRow} ${msg.role === "user" ? styles.userRow : styles.botRow}`}>
                                        {msg.role === "bot" && (
                                            <Image src="/chatbot.png" alt="Bot" width={36} height={36} className={styles.msgAvatar} />
                                        )}
                                        <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.botBubble}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                    {msg.role === "bot" && msg.actions && msg.actions.length > 0 && (
                                        <div className={styles.actionContainer}>
                                            {msg.actions.map((act, actIdx) => (
                                                <button
                                                    key={actIdx}
                                                    className={styles.actionBtn}
                                                    onClick={() => handleActionClick(act)}
                                                >
                                                    {getActionLabel(act)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className={`${styles.msgRow} ${styles.botRow}`}>
                                    <Image src="/chatbot.png" alt="Bot" width={36} height={36} className={styles.msgAvatar} />
                                    <div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}>
                                        <span>.</span><span>.</span><span>.</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 예시 질문 토글 */}
                        <div className={styles.suggestionsWrapper}>
                            <button
                                className={styles.suggestionsToggle}
                                onClick={() => setShowSuggestions(!showSuggestions)}
                            >
                                <span>{messages.length > 1 ? tChat.toggleSuggestionsAfter : tChat.toggleSuggestions}</span>
                                <span className={`${styles.toggleArrow} ${showSuggestions ? styles.open : ''}`}>▲</span>
                            </button>
                            {showSuggestions && (
                                <div className={styles.suggestions}>
                                    <div className={styles.suggestionsList}>
                                        {suggestedQuestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                className={styles.suggestionBtn}
                                                onClick={() => handleSuggestionClick(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.inputArea}>
                            <textarea
                                className={styles.input}
                                placeholder={tChat.placeholder}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim() || isLoading}>
                                {tChat.send}
                            </button>
                        </div>
                    </>
                ) : (
                    /* 폼 모드 */
                    <div className={styles.formContainer}>
                        {mode === "INQUIRY" && (
                            <>
                                <h3 className={styles.formTitle}>{tChat.inquiry.modeTitle}</h3>
                                <input
                                    className={styles.formInput}
                                    placeholder={tChat.inquiry.titlePlace}
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                />
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder={tChat.inquiry.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                />
                                <div className={styles.formActions}>
                                    <button onClick={() => setMode("CHAT")} className={styles.cancelBtn}>{tChat.cancel}</button>
                                    <button onClick={submitInquiry} disabled={isSubmitting} className={styles.submitBtn}>
                                        {isSubmitting ? "..." : tChat.inquiry.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REPORT" && (
                            <>
                                <h3 className={styles.formTitle}>{tChat.report.modeTitle}</h3>
                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>{tChat.report.reasonLabel}</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className={styles.formSelect}
                                    >
                                        <option value="SPAM">{tChat.report.reasons.SPAM}</option>
                                        <option value="INAPPROPRIATE">{tChat.report.reasons.INAPPROPRIATE}</option>
                                        <option value="ABUSE">{tChat.report.reasons.ABUSE}</option>
                                        <option value="COPYRIGHT">{tChat.report.reasons.COPYRIGHT}</option>
                                        <option value="OTHER">{tChat.report.reasons.OTHER}</option>
                                    </select>
                                </div>
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder={tChat.report.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                />
                                <div className={styles.formActions}>
                                    <button onClick={() => setMode("CHAT")} className={styles.cancelBtn}>{tChat.cancel}</button>
                                    <button onClick={submitReport} disabled={isSubmitting} className={styles.reportBtn}>
                                        {isSubmitting ? "..." : tChat.report.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REFUND" && (
                            <>
                                <h3 className={styles.formTitle}>{tChat.refund.modeTitle}</h3>
                                <p className={styles.formDesc}>{tChat.refund.desc}</p>
                                <div className={styles.refundList}>
                                    {refundList.length === 0 ? (
                                        <div className={styles.refundEmpty}>{tChat.refund.empty}</div>
                                    ) : (
                                        refundList.map((item) => (
                                            <div
                                                key={item.orderId}
                                                onClick={() => setSelectedOrderId(item.orderId)}
                                                className={`${styles.refundItem} ${selectedOrderId === item.orderId ? styles.selected : ''}`}
                                            >
                                                <div>
                                                    <div className={styles.refundItemName}>{item.planName}</div>
                                                    <div className={styles.refundItemMeta}>{(item.paidAt || item.createdAt)?.split("T")[0]} • {item.amount}원</div>
                                                </div>
                                                {selectedOrderId === item.orderId && <div className={styles.refundCheck}>✔</div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className={styles.formActions}>
                                    <button onClick={() => setMode("CHAT")} className={styles.cancelBtn}>{tChat.cancel}</button>
                                    <button onClick={submitRefund} disabled={isSubmitting || !selectedOrderId} className={styles.submitBtn}>
                                        {isSubmitting ? "..." : tChat.refund.btn}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
