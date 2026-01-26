import { useState, useRef, useEffect } from "react";
import "./BrickBotModal.css";

interface BrickBotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    role: "user" | "bot";
    content: string;
}

export default function BrickBotModal({ isOpen, onClose }: BrickBotModalProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "안녕하세요! 궁금한 점이 있으신가요? 🤖" },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 로컬에서 백엔드 API 호출 주소 (환경변수나 컨텍스트에서 가져오는 것이 좋음)
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg }),
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();
            setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
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
                        <div key={idx} className={`brickbot-msg-row ${msg.role === "user" ? "user-row" : "bot-row"}`}>
                            {msg.role === "bot" && (
                                <img src="/chatbot.png" alt="Bot" className="brickbot-msg-avatar" />
                            )}
                            <div className={`brickbot-bubble ${msg.role}`}>
                                {msg.content}
                            </div>
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
