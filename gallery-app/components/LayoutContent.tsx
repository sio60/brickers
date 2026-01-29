"use client";

import { useLanguage } from "../contexts/LanguageContext";
import Header from "./Header";
import BackgroundBricks from "./BackgroundBricks";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();

    return (
        <div className={`appLayout lang-${language}`}>
            <Header />
            <BackgroundBricks />
            <main className="appLayout__content">
                {children}
            </main>
        </div>
    );
}
