'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import FloatingMenuButton from "@/components/kids/FloatingMenuButton";
import styles from "./KidsAgeSelection.module.css";

// Three.js 컴포넌트는 SSR에서 제외
const Background3D = dynamic(
    () => import("@/components/three/Background3D"),
    { ssr: false }
);

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

function KidsAgeSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);
    const [openLoginModal, setOpenLoginModal] = useState(false);

    // URL에 ?login=true가 있으면 자동으로 로그인 모달 열기
    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthenticated) {
            setOpenLoginModal(true);
        }
    }, [searchParams, isAuthenticated]);

    const handleSelect = (ageGroup: AgeGroup) => {
        // 로그인 체크
        if (!isAuthenticated) {
            alert(t.common?.loginRequired || "Login required.");
            setOpenLoginModal(true);
            return;
        }

        setSelectedAge(ageGroup);

        // 선택 시 바로 kids/main 페이지로 이동
        if (ageGroup) {
            router.push(`/kids/main?age=${ageGroup}`);
        }
    };

    const handleContinue = () => {
        if (!isAuthenticated) {
            alert(t.common?.loginRequired || "Login required.");
            setOpenLoginModal(true);
            return;
        }

        if (!selectedAge) return;
        router.push(`/kids/main?age=${selectedAge}`);
    };

    return (
        <div className={styles.container}>
            <Background3D entryDirection="top" />
            <h1 className={styles.title}>{t.kids.title}</h1>

            <div className={styles.buttons}>
                <button
                    className={`${styles.ageBtn} ${selectedAge === "4-5" ? styles.active : ""}`}
                    onClick={() => handleSelect("4-5")}
                    type="button"
                >
                    <Image src="/35.png" alt="4-5 years" width={80} height={80} className={styles.img} />
                    <div className={styles.label}>{t.kids.level.replace("{lv}", "1")}</div>
                </button>

                <button
                    className={`${styles.ageBtn} ${selectedAge === "6-7" ? styles.active : ""}`}
                    onClick={() => handleSelect("6-7")}
                    type="button"
                >
                    <Image src="/67.png" alt="6-7 years" width={80} height={80} className={styles.img} />
                    <div className={styles.label}>{t.kids.level.replace("{lv}", "2")}</div>
                </button>

                <button
                    className={`${styles.ageBtn} ${selectedAge === "8-10" ? styles.active : ""}`}
                    onClick={() => handleSelect("8-10")}
                    type="button"
                >
                    <Image src="/810.png" alt="8-10 years" width={80} height={80} className={styles.img} />
                    <div className={styles.label}>{t.kids.level.replace("{lv}", "3")}</div>
                </button>
            </div>

            <button
                className={`${styles.continueBtn} ${selectedAge ? styles.visible : ""}`}
                onClick={handleContinue}
                disabled={!selectedAge}
                type="button"
            >
                {t.kids.continueBtn}
            </button>

            {/* 로그인 모달 */}
            <LoginModal
                isOpen={openLoginModal}
                onClose={() => setOpenLoginModal(false)}
            />

            {/* 플로팅 메뉴 */}
            <FloatingMenuButton />
        </div>
    );
}

export default function KidsAgeSelection() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KidsAgeSelectionContent />
        </Suspense>
    );
}
