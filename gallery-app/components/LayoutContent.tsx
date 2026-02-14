"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import Header from "./Header";
import BackgroundBricks from "./BackgroundBricks";
import FloatingMenuButton from "./kids/FloatingMenuButton";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const pathname = usePathname();

    const isAuthWaitingPage = pathname === "/auth/success" || pathname === "/auth/logout";
    const isStepsPage = pathname === "/kids/steps";
    const isAdminRoute = pathname.startsWith("/admin");

    return (
        <div className={`appLayout lang-${language}`}>
            <Header />
            {!isAuthWaitingPage && !isStepsPage && <BackgroundBricks />}
            <main className="appLayout__content">
                {children}
            </main>
            {!isAdminRoute && !isAuthWaitingPage && <FloatingMenuButton />}
        </div>
    );
}
