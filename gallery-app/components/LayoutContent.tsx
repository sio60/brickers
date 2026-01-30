"use client";

import { useLanguage } from "../contexts/LanguageContext";
import Header from "./Header";
import BackgroundBricks from "./BackgroundBricks";
import FloatingMenuButton from "./kids/FloatingMenuButton";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();

    return (
        <div className={`appLayout lang-${language}`}>
            <Header />
            <BackgroundBricks />
            <main className="appLayout__content">
                {children}
            </main>
            <FloatingMenuButton />
        </div>
    );
}
