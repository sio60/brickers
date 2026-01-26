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

    // 로컬에서 백엔드 API 호출 주소
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="brickbot-overlay" onClick={onClose}>
            <div className="brickbot-container" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="brickbot-header">
                    <div className="brickbot-profile">
                        {/* 상단 이미지 제거됨 */}
                        <span className="brickbot-name">BrickBot</span>
                    </div>
                    <button className="brickbot-close" onClick={onClose}>✕</button>
                </div>

                {/* 채팅 영역 */}
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

                            {/* 액션 버튼 렌더링 */}
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
                                            onClick={() => setInput(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 입력 영역 */}
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
            </div>
        </div>
    );
}
