import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/common/LoginModal";
import KidsModelSelectModal from "@/components/kids/KidsModelSelectModal";
import styles from "./KidsAgeSelection.module.css";

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

function KidsAgeSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);
    const [openLoginModal, setOpenLoginModal] = useState(false);
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

    // URL에 ?login=true가 있으면 자동으로 로그인 모달 열기
    useEffect(() => {
        if (searchParams.get("login") === "true" && !isAuthenticated) {
            setOpenLoginModal(true);
        }
    }, [searchParams, isAuthenticated]);

    const handleSelect = (ageGroup: AgeGroup) => {
        if (!isAuthenticated) {
            alert(t.common?.loginRequired || "Login required.");
            setOpenLoginModal(true);
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
            // 파일을 Data URL로 변환하여 sessionStorage에 저장 (KidsPage에서 복원 가능하도록)
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
            alert(t.common?.loginRequired || "Login required.");
            setOpenLoginModal(true);
            return;
        }

        if (!selectedAge) return;
        setModalAge(selectedAge);
        setOpenModelModal(true);
    };

    return (
        <div className={styles.container}>
            {/* 헤더 */}
            <header className="fixed top-0 left-0 w-full h-[72px] flex items-center justify-center px-5 bg-white border-b border-[#e0e0e0] z-50">
                <Link href="/" className="h-12 cursor-pointer flex items-center justify-center">
                    <Image
                        src="/logo.png"
                        alt="BRICKERS"
                        width={160}
                        height={48}
                        className="h-full w-auto object-contain"
                        priority
                    />
                </Link>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <Link
                        href="/gallery"
                        className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                    >
                        {t.header?.gallery || 'Gallery'}
                    </Link>
                    {isAuthenticated ? (
                        <Link
                            href="/mypage"
                            className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                            {t.header?.myPage || 'My Page'}
                        </Link>
                    ) : (
                        <button
                            onClick={() => setOpenLoginModal(true)}
                            className="px-4 py-2 text-sm font-bold bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all"
                        >
                            {t.header?.login || 'Login'}
                        </button>
                    )}
                </div>
            </header>

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

            {/* 모델 선택 모달 */}
            <KidsModelSelectModal
                open={openModelModal}
                onClose={() => setOpenModelModal(false)}
                onSelect={handlePickModel}
                items={getCurrentModels()}
            />

            {/* 로그인 모달 */}
            <LoginModal
                isOpen={openLoginModal}
                onClose={() => setOpenLoginModal(false)}
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
