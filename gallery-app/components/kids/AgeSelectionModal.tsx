'use client';

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KidsModelSelectModal from "./KidsModelSelectModal";
// import styles from "./AgeSelectionModal.module.css"; // Removed

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

interface AgeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string | null, file: File | null, age: string) => void;
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

    const handlePickModel = (url: string | null, file: File | null) => {
        setOpenModelModal(false);
        onSelect(url, file, modalAge || "4-5");
        onClose();
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[8px] flex items-center justify-center z-[2000] animate-[fadeIn_0.3s_ease]" onClick={onClose}>
                    <div className="bg-white p-10 rounded-[40px] w-[90%] max-w-[800px] relative shadow-[0_20px_40px_rgba(0,0,0,0.2)] border-[3px] border-black text-center" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-[24px] font-bold flex items-center justify-center transition-all duration-200 text-black hover:rotate-90 hover:scale-110" onClick={onClose}>✕</button>
                        <h1 className="text-[48px] font-black mb-10 text-black uppercase sm:text-[32px]">{t.kids.title}</h1>

                        <div className="flex justify-center gap-[30px] sm:flex-col sm:items-center">
                            <button
                                className={`bg-white border-[3px] border-black rounded-[32px] p-6 w-[200px] h-[240px] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center justify-center gap-4 hover:-translate-y-1 hover:bg-[#ffe135] hover:shadow-none hover:border-black active:bg-[#ffe135] active:text-black active:translate-y-[2px] active:shadow-none active:border-black sm:w-full sm:flex-row sm:p-[16px_24px] ${selectedAge === "4-5" ? "bg-[#ffe135] text-black translate-y-[2px] shadow-none border-black" : ""}`}
                                onClick={() => handleSelect("4-5")}
                            >
                                <div className="text-[64px] font-black text-black">{t.kids.level.replace("{lv}", "1")}</div>
                            </button>

                            <button
                                className={`bg-white border-[3px] border-black rounded-[32px] p-6 w-[200px] h-[240px] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center justify-center gap-4 hover:-translate-y-1 hover:bg-[#ffe135] hover:shadow-none hover:border-black active:bg-[#ffe135] active:text-black active:translate-y-[2px] active:shadow-none active:border-black sm:w-full sm:flex-row sm:p-[16px_24px] ${selectedAge === "6-7" ? "bg-[#ffe135] text-black translate-y-[2px] shadow-none border-black" : ""}`}
                                onClick={() => handleSelect("6-7")}
                            >
                                <div className="text-[64px] font-black text-black">{t.kids.level.replace("{lv}", "2")}</div>
                            </button>

                            <button
                                className={`bg-white border-[3px] border-black rounded-[32px] p-6 w-[200px] h-[240px] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center justify-center gap-4 hover:-translate-y-1 hover:bg-[#ffe135] hover:shadow-none hover:border-black active:bg-[#ffe135] active:text-black active:translate-y-[2px] active:shadow-none active:border-black sm:w-full sm:flex-row sm:p-[16px_24px] ${selectedAge === "8-10" ? "bg-[#ffe135] text-black translate-y-[2px] shadow-none border-black" : ""}`}
                                onClick={() => handleSelect("8-10")}
                            >
                                <div className="text-[64px] font-black text-black">{t.kids.level.replace("{lv}", "3")}</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <KidsModelSelectModal
                open={openModelModal}
                onClose={() => setOpenModelModal(false)}
                onSelect={handlePickModel}
                items={getCurrentModels()}
            />
        </>
    );
}
