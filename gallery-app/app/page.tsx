'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import KidsModelSelectModal from "@/components/kids/KidsModelSelectModal";
import './KidsAgeSelection.css';

// SSR 제외 컴포넌트
const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

function KidsAgeSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);
    const [openModelModal, setOpenModelModal] = useState(false);
    const [modalAge, setModalAge] = useState<AgeGroup>(null);

    // 4-5 모델들
    const models45 = [
        { title: t.kids.model1, url: "/ldraw/models/3-5_1.ldr", thumbnail: "/3-5.png" },
        { title: t.kids.model2, url: "/ldraw/models/3-5_2.ldr", thumbnail: "/3-5_2.png" },
    ];

    // 6-7 모델들
    const models67 = [
        { title: t.kids.model1, url: "/ldraw/models/6-7_1.ldr", thumbnail: "/6-7.png" },
        { title: t.kids.model2, url: "/ldraw/models/6-7_2.ldr", thumbnail: "/6-7_2.png" },
    ];

    // 8-10 모델들
    const models810 = [
        { title: t.kids.model1, url: "/ldraw/models/8-10_1.ldr", thumbnail: "/8-10.png" },
        { title: t.kids.model2, url: "/ldraw/models/8-10_2.ldr", thumbnail: "/8-10_2.png" },
    ];

    const getCurrentModels = () => {
        if (modalAge === "6-7") return models67;
        if (modalAge === "8-10") return models810;
        return models45;
    };


    const handleSelect = (ageGroup: AgeGroup) => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        setSelectedAge(ageGroup);

        if (ageGroup) {
            setModalAge(ageGroup);
            setOpenModelModal(true);
        }
    };

    const handlePickModel = async (url: string | null, file: File | null) => {
        setOpenModelModal(false);
        const age = modalAge || "4-5";

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                sessionStorage.setItem('pendingUpload', JSON.stringify({
                    name: file.name,
                    type: file.type,
                    dataUrl
                }));
                router.push(`/kids/main?age=${age}`);
            };
            reader.readAsDataURL(file);
        } else if (url) {
            const modelParam = `&model=${encodeURIComponent(url)}`;
            router.push(`/kids/main?age=${age}${modelParam}`);
        }
    };

    const handleContinue = () => {
        if (!isAuthenticated) {
            router.push('?login=true');
            return;
        }

        if (!selectedAge) return;
        setModalAge(selectedAge);
        setOpenModelModal(true);
    };

    return (
        <div className="kidsAgeSelection">
            <Background3D entryDirection="top" />
            <h1 className="kidsAgeSelection__title">{t.kids.title}</h1>

            <div className="kidsAgeSelection__buttons">
                <button
                    className={`kidsAgeBtn ${selectedAge === "4-5" ? "active" : ""}`}
                    onClick={() => handleSelect("4-5")}
                    type="button"
                >
                    <Image src="/35.png" alt="4-5 years" width={80} height={80} className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "1")}</div>
                </button>

                <button
                    className={`kidsAgeBtn ${selectedAge === "6-7" ? "active" : ""}`}
                    onClick={() => handleSelect("6-7")}
                    type="button"
                >
                    <Image src="/67.png" alt="6-7 years" width={80} height={80} className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "2")}</div>
                </button>

                <button
                    className={`kidsAgeBtn ${selectedAge === "8-10" ? "active" : ""}`}
                    onClick={() => handleSelect("8-10")}
                    type="button"
                >
                    <Image src="/810.png" alt="8-10 years" width={80} height={80} className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "3")}</div>
                </button>
            </div>

            <button
                className={`kidsAgeSelection__continue ${selectedAge ? "visible" : ""}`}
                onClick={handleContinue}
                disabled={!selectedAge}
                type="button"
            >
                {t.kids.continueBtn}
            </button>

            {/* 모델 선택 모달 */}
            <KidsModelSelectModal
                open={openModelModal}
                onClose={() => setOpenModelModal(false)}
                onSelect={handlePickModel}
                items={getCurrentModels()}
            />
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

