import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BrickBotModal.css";

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    role: "user" | "bot";
    content: string;
    actionType?: "create" | "gallery" | "mypage" | null;
}

export default function BrickBotModal({ isOpen, onClose }: BrickBotModalProps) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "안녕하세요! 궁금한 점이 있으신가요? 🤖" },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 예시 질문 목록
    const suggestedQuestions = [
        "레고 어떻게 만들어요?",
        "갤러리는 뭐예요?",
        "문의하기",
        "신고하기",
        "환불 요청",
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
        if (q === "문의하기") {
            setMode("INQUIRY");
            setFormTitle("");
            setFormContent("");
        } else if (q === "신고하기") {
            setMode("REPORT");
            setFormContent("");
            setReportReason("SPAM");
        } else if (q === "환불 요청") {
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
            const res = await fetch(`${API_BASE}/api/payments/my/history?page=0&size=10`);
            if (res.ok) {
                const data = await res.json();
                setRefundList(data.content || []);
            } else {
                alert("결제 내역을 불러오는데 실패했습니다.");
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
                body: JSON.stringify({ message: userMsg }),
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();

            // 응답 파싱
            const { cleanText, action } = parseBotResponse(data.reply);
            setMessages((prev) => [...prev, { role: "bot", content: cleanText, actionType: action }]);

        } catch (e) {
            setMessages((prev) => [
                ...prev,
                { role: "bot", content: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요!" },
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
            const res = await fetch(`${API_BASE}/api/inquiries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: formTitle, content: formContent }),
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: "✅ 문의가 접수되었습니다! 관리자가 확인 후 빠르게 답변드리겠습니다." }]);
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
            const res = await fetch(`${API_BASE}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetType: "GENERAL",
                    targetId: "0", // 챗봇 일반 신고는 0으로 처리 (백엔드 허용 필요하거나 임시조치)
                    reason: reportReason,
                    details: formContent
                }),
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: "🚨 신고가 접수되었습니다. 관리자가 검토 후 조치하겠습니다." }]);
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
            const res = await fetch(`${API_BASE}/api/payments/orders/${selectedOrderId}/cancel`, {
                method: "POST",
            });
            if (res.ok) {
                setMode("CHAT");
                setMessages(prev => [...prev, { role: "bot", content: "💸 환불 요청이 접수되었습니다. 처리 결과는 알림으로 알려드릴게요." }]);
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
                        <span className="brickbot-name">BrickBot {mode !== "CHAT" && ` - ${mode === "INQUIRY" ? "문의" : mode === "REPORT" ? "신고" : "환불"}`}</span>
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
                                                {msg.actionType === "create" && "🧱 레고 만들기 시작"}
                                                {msg.actionType === "gallery" && "🖼️ 갤러리 구경하기"}
                                                {msg.actionType === "mypage" && "👤 내 정보 보기"}
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
                                    <span>이런 질문을 해보세요</span>
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
                                placeholder="궁금한 내용을 입력하세요..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <button className="brickbot-send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
                                전송
                            </button>
                        </div>
                    </>
                ) : (
                    /* 폼 모드 */
                    <div className="brickbot-form-container" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                        {mode === "INQUIRY" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>1:1 문의하기</h3>
                                <input
                                    className="brickbot-form-input"
                                    placeholder="문의 제목"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "10px" }}
                                />
                                <textarea
                                    className="brickbot-form-textarea"
                                    placeholder="문의 내용을 자세히 적어주세요."
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", minHeight: "150px", marginBottom: "20px", resize: "none" }}
                                />
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>취소</button>
                                    <button onClick={submitInquiry} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? "전송 중..." : "문의 접수"}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REPORT" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>신고하기</h3>
                                <div style={{ marginBottom: "10px" }}>
                                    <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>신고 사유</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px" }}
                                    >
                                        <option value="SPAM">스팸 / 부적절한 홍보</option>
                                        <option value="INAPPROPRIATE_CONTENT">부적절한 콘텐츠</option>
                                        <option value="ABUSIVE_LANGUAGE">욕설 / 비하 발언</option>
                                        <option value="OTHER">기타</option>
                                    </select>
                                </div>
                                <textarea
                                    className="brickbot-form-textarea"
                                    placeholder="신고 내용을 적어주세요."
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    style={{ padding: "12px", border: "1px solid #ddd", borderRadius: "8px", minHeight: "150px", marginBottom: "20px", resize: "none" }}
                                />
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>취소</button>
                                    <button onClick={submitReport} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#f00", color: "#fff", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? "전송 중..." : "신고 접수"}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === "REFUND" && (
                            <>
                                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>환불 요청</h3>
                                <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>최근 결제 내역 중 환불할 항목을 선택해주세요.</p>
                                <div style={{ flex: 1, overflowY: "auto", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                                    {refundList.length === 0 ? (
                                        <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>결제 내역이 없습니다.</div>
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
                                    <button onClick={() => setMode("CHAT")} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>취소</button>
                                    <button onClick={submitRefund} disabled={isSubmitting || !selectedOrderId} style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer", opacity: (isSubmitting || !selectedOrderId) ? 0.5 : 1 }}>
                                        {isSubmitting ? "처리 중..." : "환불 요청"}
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
