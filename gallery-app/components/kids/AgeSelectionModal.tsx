'use client';

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KidsModelSelectModal from "./KidsModelSelectModal";
import styles from "./AgeSelectionModal.module.css";

type AgeGroup = "4-5" | "6-7" | "8-10" | "PRO" | null;

interface AgeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string | null, file: File | null, age: string, prompt?: string) => void;
}

export default function AgeSelectionModal({ isOpen, onClose, onSelect }: AgeSelectionModalProps) {
    const { t } = useLanguage();
    const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);
    const [openModelModal, setOpenModelModal] = useState(false);
    const [modalAge, setModalAge] = useState<AgeGroup>(null);

    if (!isOpen && !openModelModal) return null;

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
        setSelectedAge(ageGroup);
        if (ageGroup) {
            setModalAge(ageGroup);
            setOpenModelModal(true);
        }
    };

    const handlePickModel = (url: string | null, file: File | null, prompt?: string) => {
        setOpenModelModal(false);
        onSelect(url, file, modalAge || "4-5", prompt);
        onClose();
    };

    return (
        <>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={onClose}>✕</button>
                        <h1 className={styles.title}>{t.kids.title}</h1>

                        <div className={styles.buttons}>
                            <button
                                className={`${styles.ageBtn} ${selectedAge === "4-5" ? styles.active : ""}`}
                                onClick={() => handleSelect("4-5")}
                            >
                                <div className={styles.ageLabel}>{t.kids.level.replace("{lv}", "1")}</div>
                                <div className={styles.brickCount}>100 {t.kids.bricks}</div>
                            </button>

                            <button
                                className={`${styles.ageBtn} ${selectedAge === "6-7" ? styles.active : ""}`}
                                onClick={() => handleSelect("6-7")}
                            >
                                <div className={styles.ageLabel}>{t.kids.level.replace("{lv}", "2")}</div>
                                <div className={styles.brickCount}>150 {t.kids.bricks}</div>
                            </button>

                            <button
                                className={`${styles.ageBtn} ${selectedAge === "8-10" ? styles.active : ""}`}
                                onClick={() => handleSelect("8-10")}
                            >
                                <div className={styles.ageLabel}>{t.kids.level.replace("{lv}", "3")}</div>
                                <div className={styles.brickCount}>200 {t.kids.bricks}</div>
                            </button>

                            <button
                                className={`${styles.ageBtn} ${selectedAge === "PRO" ? styles.active : ""}`}
                                onClick={() => handleSelect("PRO")}
                            >
                                <div className={styles.ageLabel}>PRO</div>
                                <div className={styles.brickCount}>5000+ {t.kids.bricks}</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <KidsModelSelectModal
                open={openModelModal}
                onClose={() => setOpenModelModal(false)}
                onSelect={handlePickModel}
                items={modalAge === "PRO" ? [] : getCurrentModels()}
            />
        </>
    );
}
