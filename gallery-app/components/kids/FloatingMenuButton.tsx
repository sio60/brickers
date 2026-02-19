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
