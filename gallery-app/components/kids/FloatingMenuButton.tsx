'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile } from "@/lib/api/myApi";
import LoginModal from "@/components/common/LoginModal";
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

    return (
        <>
            {/* 배경 오버레이 */}
            {isOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={styles.container}>
                {showHint && (
                    <div className={styles.hint}>
                        <button
                            type="button"
                            className={styles.hintClose}
                            onClick={() => setShowHint(false)}
                            aria-label="close"
                        >
                            ✕
                        </button>
                        <span className={styles.hintText}>{t.floatingMenu?.hint || ''}</span>
                    </div>
                )}
                {/* 메뉴 모달 */}
                <div className={`${styles.modal} ${isOpen ? styles.isOpen : ""}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={styles.item}
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <span className={styles.itemLabel}>{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* 플로팅 버튼 */}
                <button
                    className={`${styles.btn} ${isOpen ? styles.isOpen : ""}`}
                    onClick={handleMainBtnClick}
                    aria-label={t.floatingMenu.open}
                >
                    <Image
                        src="/mypage.png"
                        alt={t.floatingMenu.iconAlt}
                        width={36}
                        height={36}
                        className={styles.btnIcon}
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
