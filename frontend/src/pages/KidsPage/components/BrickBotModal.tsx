import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BrickBotModal.css";
import { useLanguage } from "../../../contexts/LanguageContext";

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    role: "user" | "bot";
    content: string;
    actionType?: "create" | "gallery" | "mypage" | null;
}

const CHAT_TRANSLATIONS = {
    ko: {
        welcome: "안녕하세요! 궁금한 점이 있으신가요? 🤖",
        suggestions: {
            howTo: "레고 어떻게 만들어요?",
            gallery: "갤러리는 뭐예요?",
            inquiry: "문의하기",
            report: "신고하기",
            refund: "환불 요청"
        },
        toggleSuggestions: "이런 질문을 해보세요",
        placeholder: "궁금한 내용을 입력하세요...",
        send: "전송",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 문의하기",
            titlePlace: "문의 제목",
            contentPlace: "문의 내용을 자세히 적어주세요.",
            btn: "문의 접수",
            confirm: "✅ 문의가 접수되었습니다! 관리자가 확인 후 빠르게 답변드리겠습니다."
        },
        report: {
            modeTitle: "신고하기",
            reasonLabel: "신고 사유",
            contentPlace: "신고 내용을 적어주세요.",
            btn: "신고 접수",
            confirm: "🚨 신고가 접수되었습니다. 관리자가 검토 후 조치하겠습니다.",
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
            confirm: "💸 환불 요청이 접수되었습니다. 처리 결과는 알림으로 알려드릴게요."
        },
        cancel: "취소",
        actions: {
            create: "🧱 레고 만들기 시작",
            gallery: "🖼️ 갤러리 구경하기",
            mypage: "👤 내 정보 보기"
        },
        error: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요!"
    },
    en: {
        welcome: "Hello! How can I help you today? 🤖",
        suggestions: {
            howTo: "How do I make Lego?",
            gallery: "What is Gallery?",
            inquiry: "Inquiry",
            report: "Report",
            refund: "Request Refund"
        },
        toggleSuggestions: "Suggested Questions",
        placeholder: "Ask me anything...",
        send: "Send",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 Inquiry",
            titlePlace: "Title",
            contentPlace: "Please describe your inquiry.",
            btn: "Submit Inquiry",
            confirm: "✅ Inquiry submitted! We will get back to you soon."
        },
        report: {
            modeTitle: "Report Details",
            reasonLabel: "Reason",
            contentPlace: "Please describe the issue.",
            btn: "Submit Report",
            confirm: "🚨 Report submitted. We will review it shortly.",
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
            confirm: "💸 Refund request submitted."
        },
        cancel: "Cancel",
        actions: {
            create: "🧱 Start Creating",
            gallery: "🖼️ Visit Gallery",
            mypage: "👤 My Page"
        },
        error: "Sorry, something went wrong. Please try again!"
    },
    ja: {
        welcome: "こんにちは！何かお手伝いしましょうか？ 🤖",
        suggestions: {
            howTo: "どうやってレゴを作るの？",
            gallery: "ギャラリーって何？",
            inquiry: "お問い合わせ",
            report: "通報する",
            refund: "返金リクエスト"
        },
        toggleSuggestions: "こんな質問はどうですか？",
        placeholder: "気になることを入力してください...",
        send: "送信",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 お問い合わせ",
            titlePlace: "タイトル",
            contentPlace: "お問い合わせ内容を詳しく書いてください。",
            btn: "送信する",
            confirm: "✅ お問い合わせを受け付けました！確認後、すぐにお答えします。"
        },
        report: {
            modeTitle: "通報する",
            reasonLabel: "通報理由",
            contentPlace: "内容を書いてください。",
            btn: "通報する",
            confirm: "🚨 通報を受け付けました。管理者が確認して対応します。",
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
            confirm: "💸 返金リクエストを受け付けました。"
        },
        cancel: "キャンセル",
        actions: {
            create: "🧱 レゴを作り始める",
            gallery: "🖼️ ギャラリーを見る",
            mypage: "👤 マイページ"
        },
        error: "申し訳ありません。問題が発生しました。もう一度お試しください！"
    }
};

export default function BrickBotModal({ isOpen, onClose }: BrickBotModalProps) {
    const navigate = useNavigate();
    const { language } = useLanguage(); // 언어 컨텍스트 사용
    const tChat = CHAT_TRANSLATIONS[language];

    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: tChat.welcome },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 언어 변경 시 초기 메시지 갱신 (선택사항, 대화 유지 원하면 제거 가능)
    useEffect(() => {
        if (messages.length === 1 && messages[0].role === "bot") {
            setMessages([{ role: "bot", content: tChat.welcome }]);
        }
    }, [language]);

    // 예시 질문 목록 (언어 반응형)
    const suggestedQuestions = [
        tChat.suggestions.howTo,
        tChat.suggestions.gallery,
        tChat.suggestions.inquiry,
        tChat.suggestions.report,
        tChat.suggestions.refund,
    ];

    // 모드 상태: 기본 채팅('CHAT'), 문의('INQUIRY'), 신고('REPORT'), 환불('REFUND')
    const [mode, setMode] = useState<"CHAT" | "INQUIRY" | "REPORT" | "REFUND">("CHAT");

    // 폼 상태
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [reportReason, setReportReason] = useState("SPAM"); // 기본값 SPAM
    const [refundList, setRefundList] = useState<any[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 로컬에서 백엔드 API 호출 주소
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && mode === "CHAT") scrollToBottom();
    }, [messages, isOpen, mode]);

    // 태그 파싱 헬퍼 함수
    const parseBotResponse = (text: string): { cleanText: string, action: Message['actionType'] } => {
        let action: Message['actionType'] = null;
        let cleanText = text;

        if (text.includes("{{NAV_CREATE}}")) {
            action = "create";
            cleanText = text.replace("{{NAV_CREATE}}", "");
        } else if (text.includes("{{NAV_GALLERY}}")) {
            action = "gallery";
            cleanText = text.replace("{{NAV_GALLERY}}", "");
        } else if (text.includes("{{NAV_MYPAGE}}")) {
            action = "mypage";
            cleanText = text.replace("{{NAV_MYPAGE}}", "");
        }

        return { cleanText, action };
    };

    const handleActionClick = (action: Message['actionType']) => {
        if (!action) return;
        onClose(); // 모달 닫고 이동
        switch (action) {
            case "create":
                navigate("/kids/main");
                break;
            case "gallery":
                navigate("/gallery");
                break;
            case "mypage":
                navigate("/mypage");
                break;
        }
    };

    // 제안 질문 클릭 처리
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

    // 환불 내역 가져오기
    const fetchPaymentHistory = async () => {
        try {
            setIsLoading(true);
            // 페이지네이션 없이 일단 최근 10개만
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/api/payments/my/history?page=0&size=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRefundList(data.content || []);
            } else {
                alert("결제 내역을 불러오는데 실패했습니다."); // TODO: i18n
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
        setShowSuggestions(false); // 질문하면 제안 숨기기

        try {
            const res = await fetch(`${API_BASE}/api/chat/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, language }), // 언어 정보 전송
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();

            // 응답 파싱
            const { cleanText, action } = parseBotResponse(data.reply);
            setMessages((prev) => [...prev, { role: "bot", content: cleanText, actionType: action }]);

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

    // --- 폼 제출 핸들러 ---

    const submitInquiry = async () => {
        if (!formTitle.trim() || !formContent.trim()) return alert("제목과 내용을 입력해주세요.");
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/api/inquiries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title: formTitle, content: formContent }),
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: tChat.inquiry.confirm }]);
            } else {
                alert("문의 접수 실패 (로그인 상태를 확인해주세요)");
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitReport = async () => {
        if (!formContent.trim()) return alert("신고 내용을 입력해주세요.");
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/api/reports`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
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
                alert("신고 접수 실패");
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitRefund = async () => {
        if (!selectedOrderId) return alert("환불할 내역을 선택해주세요.");
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/api/payments/orders/${selectedOrderId}/cancel`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: tChat.refund.confirm }]);
            } else {
                alert("환불 요청 실패");
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="brickbot-overlay" onClick={onClose}>
            <div className="brickbot-container" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="brickbot-header">
                    <div className="brickbot-profile">
                        <span className="brickbot-name">
                            {tChat.header} {mode !== "CHAT" && ` - ${mode === "INQUIRY" ? tChat.suggestions.inquiry : mode === "REPORT" ? tChat.suggestions.report : tChat.suggestions.refund}`}
                        </span>
                    </div>
                    <button className="brickbot-close" onClick={onClose}>✕</button>
                </div>

                {/* 컨텐츠 (모드에 따라 변경) */}
                {mode === "CHAT" ? (
                    <>
                        <div className="brickbot-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`brickbot-msg-group ${msg.role}`}>
                                    <div className={`brickbot-msg-row ${msg.role === "user" ? "user-row" : "bot-row"}`}>
                                        {msg.role === "bot" && (
                                            <img src="/chatbot.png" alt="Bot" className="brickbot-msg-avatar" />
                                        )}
                                        <div className={`brickbot-bubble ${msg.role}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                    {msg.role === "bot" && msg.actionType && (
                                        <div className="brickbot-action-container">
                                            <button
                                                className="brickbot-action-btn"
                                                onClick={() => handleActionClick(msg.actionType)}
                                            >
                                                {msg.actionType === "create" && tChat.actions.create}
                                                {msg.actionType === "gallery" && tChat.actions.gallery}
                                                {msg.actionType === "mypage" && tChat.actions.mypage}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="brickbot-msg-row bot-row">
                                    <img src="/chatbot.png" alt="Bot" className="brickbot-msg-avatar" />
                                    <div className="brickbot-bubble bot typing">
                                        <span>.</span><span>.</span><span>.</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 예시 질문 토글 */}
                        {messages.length <= 1 && (
                            <div className="brickbot-suggestions-wrapper">
                                <button
                                    className="brickbot-suggestions-toggle"
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                >
                                    <span>{tChat.toggleSuggestions}</span>
                                    <span className={`toggle-arrow ${showSuggestions ? 'open' : ''}`}>▲</span>
                                </button>
                                {showSuggestions && (
                                    <div className="brickbot-suggestions">
                                        <div className="brickbot-suggestions-list">
                                            {suggestedQuestions.map((q, idx) => (
                                                <button
                                                    key={idx}
                                                    className="brickbot-suggestion-btn"
                                                    onClick={() => handleSuggestionClick(q)}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="brickbot-input-area">
                            <textarea
                                className="brickbot-input"
                                placeholder={tChat.placeholder}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <button className="brickbot-send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
                                {tChat.send}
                            </button>
                        </div>
                    </>
                ) : (
                    /* 폼 모드 */
                    <div className="brickbot-form-container" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                        {mode === "INQUIRY" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>{tChat.inquiry.modeTitle}</h3>
                                <input
                                    className="brickbot-form-input"
                                    placeholder={tChat.inquiry.titlePlace}
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "10px" }}
                                />
                                <textarea
                                    className="brickbot-form-textarea"
                                    placeholder={tChat.inquiry.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", minHeight: "150px", marginBottom: "20px", resize: "none" }}
                                />
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>{tChat.cancel}</button>
                                    <button onClick={submitInquiry} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? "..." : tChat.inquiry.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REPORT" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>{tChat.report.modeTitle}</h3>
                                <div style={{ marginBottom: "10px" }}>
                                    <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>{tChat.report.reasonLabel}</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px" }}
                                    >
                                        <option value="SPAM">{tChat.report.reasons.SPAM}</option>
                                        <option value="INAPPROPRIATE">{tChat.report.reasons.INAPPROPRIATE}</option>
                                        <option value="ABUSE">{tChat.report.reasons.ABUSE}</option>
                                        <option value="COPYRIGHT">{tChat.report.reasons.COPYRIGHT}</option>
                                        <option value="OTHER">{tChat.report.reasons.OTHER}</option>
                                    </select>
                                </div>
                                <textarea
                                    className="brickbot-form-textarea"
                                    placeholder={tChat.report.contentPlace}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", minHeight: "150px", marginBottom: "20px", resize: "none" }}
                                />
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>{tChat.cancel}</button>
                                    <button onClick={submitReport} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#f00", color: "#fff", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? "..." : tChat.report.btn}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REFUND" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>{tChat.refund.modeTitle}</h3>
                                <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>{tChat.refund.desc}</p>
                                <div style={{ flex: 1, overflowY: "auto", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                                    {refundList.length === 0 ? (
                                        <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>{tChat.refund.empty}</div>
                                    ) : (
                                        refundList.map((item) => (
                                            <div
                                                key={item.orderId}
                                                onClick={() => setSelectedOrderId(item.orderId)}
                                                style={{
                                                    padding: "12px",
                                                    borderBottom: "1px solid #eee",
                                                    background: selectedOrderId === item.orderId ? "#f0f8ff" : "#fff",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center"
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{item.itemName}</div>
                                                    <div style={{ fontSize: "12px", color: "#888" }}>{item.orderedAt?.split("T")[0]} • {item.amount}원</div>
                                                </div>
                                                {selectedOrderId === item.orderId && <div style={{ color: "#007bff", fontWeight: "bold" }}>✔</div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>{tChat.cancel}</button>
                                    <button onClick={submitRefund} disabled={isSubmitting || !selectedOrderId} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer", opacity: (isSubmitting || !selectedOrderId) ? 0.5 : 1 }}>
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
