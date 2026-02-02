'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
// import styles from "./BrickBotModal.module.css"; // Removed

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    role: "user" | "bot";
    content: string;
    actions?: ("create" | "gallery" | "mypage")[];
}

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
            empty: "결제 내역이 없습니다.",
            btn: "환불 요청",
            confirm: "환불 요청이 접수되었습니다. 처리 결과는 알림으로 알려드릴게요."
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
            empty: "No payment history.",
            btn: "Request Refund",
            confirm: "Refund request submitted."
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
            empty: "決済履歴がありません。",
            btn: "リクエスト",
            confirm: "返金リクエストを受け付けました。"
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

export default function BrickBotModal({ isOpen, onClose }: BrickBotModalProps) {
    const router = useRouter();
    const { language } = useLanguage();
    const tChat = CHAT_TRANSLATIONS[language as keyof typeof CHAT_TRANSLATIONS] || CHAT_TRANSLATIONS.ko;
    const { isAuthenticated, authFetch } = useAuth();

    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: tChat.welcome },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && mode === "CHAT") scrollToBottom();
    }, [messages, isOpen, mode]);

    type ActionType = "create" | "gallery" | "mypage";

    const parseBotResponse = (text: string): { cleanText: string, actions: ActionType[] } => {
        const actions: ActionType[] = [];
        let cleanText = text;

        if (cleanText.includes("{{NAV_CREATE}}")) {
            actions.push("create");
        }
        if (cleanText.includes("{{NAV_GALLERY}}")) {
            actions.push("gallery");
        }
        if (cleanText.includes("{{NAV_MYPAGE}}")) {
            actions.push("mypage");
        }

        cleanText = cleanText.replace(/\{\{NAV_CREATE\}\}/g, "")
            .replace(/\{\{NAV_GALLERY\}\}/g, "")
            .replace(/\{\{NAV_MYPAGE\}\}/g, "")
            .trim();

        return { cleanText, actions };
    };

    const handleActionClick = (action: ActionType) => {
        if (!action) return;
        onClose();
        switch (action) {
            case "create":
                router.push("/kids/main");
                break;
            case "gallery":
                router.push("/gallery");
                break;
            case "mypage":
                router.push("/mypage");
                break;
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
            const res = await authFetch("/api/payments/my/history?page=0&size=10");
            if (res.ok) {
                const data = await res.json();
                setRefundList(data.content || []);
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
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setIsLoading(true);
        setShowSuggestions(false);

        try {
            const res = await authFetch("/api/chat/query", {
                method: "POST",
                body: JSON.stringify({ message: userMsg, language }),
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();
            const { cleanText, actions } = parseBotResponse(data.reply);
            setMessages((prev) => [...prev, { role: "bot", content: cleanText, actions: actions.length > 0 ? actions : undefined }]);

        } catch (e) {
            setMessages((prev) => [
                ...prev,
                { role: "bot", content: tChat.error },
            ]);
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
                setMessages(prev => [...prev, { role: "bot", content: tChat.refund.confirm }]);
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
        <div className="fixed top-0 left-0 w-screen h-screen bg-transparent flex justify-end items-end pr-6 pb-[100px] z-[9999] pointer-events-none" onClick={onClose}>
            <div className="w-[380px] h-[600px] bg-white border-2 border-black rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden pointer-events-auto animate-[slideUp_0.3s_cubic-bezier(0.4,0,0.2,1)] sm:w-full sm:h-full sm:rounded-none" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="h-[60px] bg-white flex items-center justify-between px-5 border-b-2 border-[#f0f0f0]">
                    <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[18px] text-black">
                            {tChat.header} {mode !== "CHAT" && ` - ${mode === "INQUIRY" ? tChat.suggestions.inquiry : mode === "REPORT" ? tChat.suggestions.report : tChat.suggestions.refund}`}
                        </span>
                    </div>
                    <button className="bg-none border-none text-[24px] text-black cursor-pointer transition-transform duration-300 flex items-center justify-center w-10 h-10 hover:rotate-90" onClick={onClose}>×</button>
                </div>

                {/* 컨텐츠 */}
                {mode === "CHAT" ? (
                    <>
                        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-white">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col gap-1.5 w-full ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                                        {msg.role === "bot" && (
                                            <Image src="/chatbot.png" alt="Bot" width={36} height={36} className="w-9 h-9 rounded object-contain bg-transparent border-none shrink-0 mt-0.5" />
                                        )}
                                        <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed break-words relative ${msg.role === "user" ? "bg-black text-white rounded-tr-sm" : "bg-white text-black border-2 border-black rounded-tl-sm"}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                    {msg.role === "bot" && msg.actions && msg.actions.length > 0 && (
                                        <div className="ml-[50px] -mt-1">
                                            {msg.actions.map((act, actIdx) => (
                                                <button
                                                    key={actIdx}
                                                    className="bg-[#f0f4f8] border border-[#d1d9e6] rounded-xl px-4 py-2 text-[13px] font-bold text-[#333] cursor-pointer transition-all duration-200 shadow-sm hover:bg-[#e2e8f0] hover:-translate-y-px hover:shadow"
                                                    onClick={() => handleActionClick(act)}
                                                >
                                                    {act === "create" && tChat.actions.create}
                                                    {act === "gallery" && tChat.actions.gallery}
                                                    {act === "mypage" && tChat.actions.mypage}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-2.5 max-w-[85%] self-start">
                                    <Image src="/chatbot.png" alt="Bot" width={36} height={36} className="w-9 h-9 rounded object-contain bg-transparent border-none shrink-0 mt-0.5" />
                                    <div className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed break-words relative bg-white text-black border-2 border-black rounded-tl-sm flex gap-1 items-center p-3.5">
                                        <span className="w-1 h-1 bg-[#888] rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] delay-[-0.32s]"></span>
                                        <span className="w-1 h-1 bg-[#888] rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] delay-[-0.16s]"></span>
                                        <span className="w-1 h-1 bg-[#888] rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 예시 질문 토글 */}
                        <div className="border-t border-[#eee] bg-white flex flex-col">
                            <button
                                className="flex justify-between items-center w-full px-4 py-3 bg-none border-none text-[13px] font-semibold text-[#555] cursor-pointer transition-colors hover:bg-[#f9f9f9]"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                            >
                                <span>{messages.length > 1 ? tChat.toggleSuggestionsAfter : tChat.toggleSuggestions}</span>
                                <span className={`inline-block transition-transform duration-300 text-[10px] ${showSuggestions ? "rotate-180" : ''}`}>▲</span>
                            </button>
                            {showSuggestions && (
                                <div className="px-4 pb-4 bg-white animate-[slideDown_0.3s_ease-out]">
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQuestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                className="bg-white border border-[#ddd] rounded-2xl px-3 py-1.5 text-xs text-[#444] cursor-pointer transition-all duration-200 whitespace-nowrap shadow-sm hover:bg-[#f0f0f0] hover:border-[#ccc] hover:-translate-y-px hover:text-black"
                                                onClick={() => handleSuggestionClick(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-2.5 flex gap-2 border-t border-[#eee]">
                            <textarea
                                className="flex-1 border-none bg-[#f2f2f2] rounded-[18px] px-3.5 py-2.5 text-sm resize-none outline-none"
                                placeholder={tChat.placeholder}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <button className="bg-black border-none rounded-[18px] px-4 font-semibold text-white cursor-pointer transition-colors disabled:bg-[#eee] disabled:text-[#aaa] disabled:cursor-not-allowed" onClick={handleSend} disabled={!input.trim() || isLoading}>
                                {tChat.send}
                            </button>
                        </div>
                    </>
                ) : (
                    /* 폼 모드 */
                    <div className="p-5 flex flex-col h-full overflow-y-auto">
                        {mode === "INQUIRY" && (
                            <>
                                <h3 className="text-lg mb-4 font-bold">{tChat.inquiry.modeTitle}</h3>
                                <input
                                    className="p-3 border border-[#ddd] rounded-lg mb-2.5 text-sm"
                                    placeholder={tChat.inquiry.titlePlace}
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                />
                                <textarea
                                    className="p-3 border border-[#ddd] rounded-lg mb-5 min-h-[150px] resize-none text-sm"
                                    placeholder={tChat.inquiry.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                />
                                <div className="flex gap-2.5 mt-auto">
                                    <button onClick={() => setMode("CHAT")} className="flex-1 p-3 rounded-lg border border-[#ddd] bg-white cursor-pointer text-sm">{tChat.cancel}</button>
                                    <button onClick={submitInquiry} disabled={isSubmitting} className="flex-[2] p-3 rounded-lg border-none bg-black text-white cursor-pointer text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isSubmitting ? "..." : tChat.inquiry.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REPORT" && (
                            <>
                                <h3 className="text-lg mb-4 font-bold">{tChat.report.modeTitle}</h3>
                                <div className="mb-2.5">
                                    <label className="text-[13px] text-[#666] block mb-1">{tChat.report.reasonLabel}</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className="w-full p-3 border border-[#ddd] rounded-lg text-sm"
                                    >
                                        <option value="SPAM">{tChat.report.reasons.SPAM}</option>
                                        <option value="INAPPROPRIATE">{tChat.report.reasons.INAPPROPRIATE}</option>
                                        <option value="ABUSE">{tChat.report.reasons.ABUSE}</option>
                                        <option value="COPYRIGHT">{tChat.report.reasons.COPYRIGHT}</option>
                                        <option value="OTHER">{tChat.report.reasons.OTHER}</option>
                                    </select>
                                </div>
                                <textarea
                                    className="p-3 border border-[#ddd] rounded-lg mb-5 min-h-[150px] resize-none text-sm"
                                    placeholder={tChat.report.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                />
                                <div className="flex gap-2.5 mt-auto">
                                    <button onClick={() => setMode("CHAT")} className="flex-1 p-3 rounded-lg border border-[#ddd] bg-white cursor-pointer text-sm">{tChat.cancel}</button>
                                    <button onClick={submitReport} disabled={isSubmitting} className="flex-[2] p-3 rounded-lg border-none bg-red-600 text-white cursor-pointer text-sm font-semibold disabled:opacity-70">
                                        {isSubmitting ? "..." : tChat.report.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REFUND" && (
                            <>
                                <h3 className="text-lg mb-4 font-bold">{tChat.refund.modeTitle}</h3>
                                <p className="text-[13px] text-[#666] mb-3">{tChat.refund.desc}</p>
                                <div className="flex-1 overflow-y-auto border border-[#eee] rounded-lg mb-5">
                                    {refundList.length === 0 ? (
                                        <div className="p-5 text-center text-[#999]">{tChat.refund.empty}</div>
                                    ) : (
                                        refundList.map((item) => (
                                            <div
                                                key={item.orderId}
                                                onClick={() => setSelectedOrderId(item.orderId)}
                                                className={`p-3 border-b border-[#eee] bg-white cursor-pointer flex justify-between items-center ${selectedOrderId === item.orderId ? "bg-[#f0f8ff]" : ''}`}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm">{item.itemName}</div>
                                                    <div className="text-xs text-[#888]">{item.orderedAt?.split("T")[0]} • {item.amount}원</div>
                                                </div>
                                                {selectedOrderId === item.orderId && <div className="text-[#007bff] font-bold">✔</div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="flex gap-2.5 mt-auto">
                                    <button onClick={() => setMode("CHAT")} className="flex-1 p-3 rounded-lg border border-[#ddd] bg-white cursor-pointer text-sm">{tChat.cancel}</button>
                                    <button onClick={submitRefund} disabled={isSubmitting || !selectedOrderId} className="flex-[2] p-3 rounded-lg border-none bg-black text-white cursor-pointer text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
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
