'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile } from "@/lib/api/myApi";
import LoginModal from "@/components/common/LoginModal";
import BrickBotModal from "./BrickBotModal";
// import styles from "./FloatingMenuButton.module.css"; // Removed

export default function FloatingMenuButton() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [isAdmin, setIsAdmin] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            getMyProfile().then(profile => {
                if (profile.role === "ADMIN") {
                    setIsAdmin(true);
                }
            }).catch(console.error);
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const menuItems = [
        { id: "mypage", label: t.floatingMenu?.mypage || "My Page" },
        { id: "chatbot", label: t.floatingMenu?.chatbot || "BrickBot" },
    ];

    if (isAdmin) {
        menuItems.push({ id: "admin", label: t.floatingMenu?.admin || "Admin Page" });
    }

    const handleMenuClick = (id: string) => {
        setIsOpen(false);

        switch (id) {
            case "mypage":
                router.push("/mypage");
                break;
            case "chatbot":
                setIsChatOpen(true);
                break;
            case "gallery":
                router.push("/gallery");
                break;
            case "admin":
                router.push("/admin");
                break;
        }
    };

    const handleMainBtnClick = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }
        setIsOpen(!isOpen);
    };

    if (pathname?.startsWith('/gallery/') && pathname.split('/').length > 2) {
        return null;
    }

    return (
        <>
            {/* 배경 오버레이 */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[999] bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
                {/* 메뉴 모달 */}
                <div className={`absolute bottom-[72px] right-0 bg-white rounded-2xl border-2 border-black shadow-[0_8px_32px_rgba(0,0,0,0.18)] py-2 min-w-[180px] opacity-0 invisible translate-y-5 scale-95 transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${isOpen ? "opacity-100 visible translate-y-0 scale-100 pointer-events-auto" : ""}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className="flex items-center gap-3 w-full px-5 py-3.5 border-none bg-transparent cursor-pointer text-[15px] font-semibold text-[#333] transition-colors duration-150 text-left hover:bg-transparent"
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <span className="flex-1">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* 플로팅 버튼 */}
                <button
                    className={`w-[60px] h-[60px] rounded-full border-2 border-black bg-white cursor-pointer flex items-center justify-center p-0 overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:bg-[#ffe135] hover:scale-105 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] ${isOpen ? "bg-[#ffe135] rotate-45" : ""}`}
                    onClick={handleMainBtnClick}
                    aria-label={t.floatingMenu.open}
                >
                    <Image
                        src="/mypage.png"
                        alt={t.floatingMenu.iconAlt}
                        width={36}
                        height={36}
                        className={`w-9 h-9 object-contain transition-transform duration-250 ${isOpen ? "-rotate-45" : ""}`}
                    />
                </button>
            </div>


            <BrickBotModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </>
    );
}
