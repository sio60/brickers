'use client';

import React from "react";
import Image from "next/image";
import type { ChatTranslation } from "./translations";
import styles from "../BrickBotModal.module.css";

export type ActionType =
    | "create"
    | "gallery"
    | "mypage"
    | "inquiries"
    | "reports"
    | "refunds"
    | "jobs";

export interface Message {
    role: "user" | "bot";
    content: string;
    actions?: ActionType[];
}

interface ChatViewProps {
    tChat: ChatTranslation;
    messages: Message[];
    input: string;
    setInput: (v: string) => void;
    isLoading: boolean;
    showSuggestions: boolean;
    setShowSuggestions: (v: boolean) => void;
    suggestedQuestions: string[];
    onSuggestionClick: (q: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onActionClick: (action: ActionType) => void;
    getActionLabel: (action: ActionType) => string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatView({
    tChat,
    messages,
    input,
    setInput,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    suggestedQuestions,
    onSuggestionClick,
    onSend,
    onKeyDown,
    onActionClick,
    getActionLabel,
    messagesEndRef,
}: ChatViewProps) {
    return (
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
                                        onClick={() => onActionClick(act)}
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

            <div className={styles.suggestionsWrapper}>
                <button
                    className={styles.suggestionsToggle}
                    onClick={() => setShowSuggestions(!showSuggestions)}
                >
                    <span>{messages.length > 1 ? tChat.toggleSuggestionsAfter : tChat.toggleSuggestions}</span>
                    <span className={`${styles.toggleArrow} ${showSuggestions ? styles.open : ''}`}>&#9650;</span>
                </button>
                {showSuggestions && (
                    <div className={styles.suggestions}>
                        <div className={styles.suggestionsList}>
                            {suggestedQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    className={styles.suggestionBtn}
                                    onClick={() => onSuggestionClick(q)}
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
                    onKeyDown={onKeyDown}
                    rows={1}
                />
                <button className={styles.sendBtn} onClick={onSend} disabled={!input.trim() || isLoading}>
                    {tChat.send}
                </button>
            </div>
        </>
    );
}
