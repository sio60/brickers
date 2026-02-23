'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile } from "@/lib/api/myApi";
import LoginModal from "@/components/common/LoginModal";
import AgeSelectionModal from "@/components/kids/AgeSelectionModal";
import BrickBotModal from "./BrickBotModal";
import styles from "./FloatingMenuButton.module.css";

export default function FloatingMenuButton() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [isAdmin, setIsAdmin] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [showHint, setShowHint] = useState(true);

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

    const handleCreateAction = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }
        setIsAgeModalOpen(true);
    };

    const compressImage = (file: File, maxDim = 2048, quality = 0.8): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleLevelSelect = async (url: string | null, file: File | null, age: string, prompt?: string) => {
        if (prompt) {
            router.push(`/kids/main?age=${age}&prompt=${encodeURIComponent(prompt)}`);
            return;
        }

        if (file) {
            try {
                const dataUrl = await compressImage(file);
                sessionStorage.setItem('pendingUpload', JSON.stringify({
                    name: file.name,
                    type: file.type,
                    dataUrl
                }));
            } catch {
                console.error('Failed to store upload');
            }
            router.push(`/kids/main?age=${age}`);
            return;
        }

        if (url) {
            router.push(`/kids/main?age=${age}&model=${encodeURIComponent(url)}`);
        }
    };

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
                {showHint && (
                    <div className={`relative mb-2.5 bg-white border-2 border-black rounded-2xl py-2.5 pr-[38px] pl-4 text-[13px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.15)] max-w-[320px] whitespace-nowrap ${styles.hint}`}>
                        <button
                            type="button"
                            className="absolute top-1.5 right-1.5 w-[22px] h-[22px] rounded-full border-none bg-transparent text-xs font-[800] cursor-pointer leading-none transition-transform duration-200 ease-in-out hover:rotate-90"
                            onClick={() => setShowHint(false)}
                            aria-label="close"
                        >
                            ✕
                        </button>
                        <span className="block leading-[1.3]">{t.floatingMenu?.hint || ''}</span>
                    </div>
                )}
                {/* 메뉴 모달 */}
                <div className={`absolute bottom-[72px] right-0 bg-white rounded-2xl border-2 border-black shadow-[0_8px_32px_rgba(0,0,0,0.18)] py-2 px-0 min-w-[180px] transition-all duration-[250ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${isOpen ? "opacity-100 visible translate-y-0 scale-100 pointer-events-auto" : "opacity-0 invisible translate-y-5 scale-95 pointer-events-none"}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className="flex items-center gap-3 w-full py-3.5 px-5 border-none bg-transparent cursor-pointer text-[15px] font-semibold text-[#333] transition-[background] duration-150 text-left hover:bg-transparent"
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <span className="flex-1">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* 플로팅 버튼 */}
                <button
                    className={`w-15 h-15 rounded-full border-2 border-black bg-white cursor-pointer flex items-center justify-center p-0 overflow-hidden transition-all duration-[250ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:bg-[#ffe135] hover:scale-[1.08] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] ${isOpen ? "bg-[#ffe135]! rotate-45" : ""}`}
                    onClick={handleMainBtnClick}
                    aria-label={t.floatingMenu.open}
                >
                    <Image
                        src="/mypage.png"
                        alt={t.floatingMenu.iconAlt}
                        width={36}
                        height={36}
                        className={`w-9 h-9 object-contain transition-transform duration-[250ms] ${isOpen ? "-rotate-45" : ""}`}
                    />
                </button>
            </div>


            <BrickBotModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onCreateAction={handleCreateAction}
            />
            <AgeSelectionModal
                isOpen={isAgeModalOpen}
                onClose={() => setIsAgeModalOpen(false)}
                onSelect={handleLevelSelect}
            />
        </>
    );
}
