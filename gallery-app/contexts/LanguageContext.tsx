'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import { ko } from "../locales/ko";
import { en } from "../locales/en";
import { ja } from "../locales/ja";

type Language = "ko" | "en" | "ja";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: any;
}

const translations = { ko, en, ja };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>("ko");
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("appLanguage");
        if (saved && (saved === "ko" || saved === "en" || saved === "ja")) {
            setLanguageState(saved as Language);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            // Remove all possible lang classes first
            document.body.classList.remove("lang-ko", "lang-en", "lang-ja");
            document.body.classList.add(`lang-${language}`);
        }
    }, [language, isInitialized]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("appLanguage", lang);
    };

    const t = translations[language];

    // Avoid hydration mismatch if needed, but for translations it's often okay to render default and then swap
    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
