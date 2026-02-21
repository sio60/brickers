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
    // 로컬 스토리지에서 이전 설정 불러오기
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem("appLanguage");
        return (saved as Language) || "ko";
    });

    useEffect(() => {
        // body에 언어 클래스 적용 (전역 폰트 및 모달 대응)
        document.body.className = `lang-${language}`;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("appLanguage", lang);
    };

    const t = translations[language];

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
