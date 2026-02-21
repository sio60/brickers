import React, { createContext, useContext, useState, useCallback } from "react";
import logo from "../assets/logo.png";
import "./Toast.css";

type ToastContextType = {
    showToast: (title: string, message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [toastData, setToastData] = useState({ title: "", message: "" });

    const showToast = useCallback((title: string, message: string) => {
        setToastData({ title, message });
        setVisible(true);
        setTimeout(() => setVisible(false), 5000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {visible && (
                <div className="globalToast">
                    <div className="globalToast__logo">
                        <img src={logo} alt="Brickers Logo" />
                    </div>
                    <div className="globalToast__content">
                        <div className="globalToast__title">{toastData.title}</div>
                        <div className="globalToast__message">{toastData.message}</div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
};
