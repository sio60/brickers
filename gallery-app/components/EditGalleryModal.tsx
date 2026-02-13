"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type EditGalleryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData: {
        title: string;
        content: string;
        tags: string[];
        visibility: "PUBLIC" | "PRIVATE";
    };
};

export default function EditGalleryModal({ isOpen, onClose, onSave, initialData }: EditGalleryModalProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState(initialData);
    const [tagInput, setTagInput] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData);
            setTagInput("");
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = () => {
        const tag = tagInput.trim();
        if (tag && !formData.tags.includes(tag)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">작품 정보 수정</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* 제목 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">제목</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                            placeholder="작품 제목을 입력하세요"
                        />
                    </div>

                    {/* 설명 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">설명</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all min-h-[100px]"
                            placeholder="작품에 대한 설명을 입력하세요"
                        />
                    </div>

                    {/* 태그 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">태그</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                placeholder="태그 입력 후 엔터"
                            />
                            <button
                                onClick={handleAddTag}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                추가
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                                    #{tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-gray-500 hover:text-red-500">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 공개 여부 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">공개 설정</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    checked={formData.visibility === "PUBLIC"}
                                    onChange={() => setFormData({ ...formData, visibility: "PUBLIC" })}
                                    className="w-4 h-4 text-black focus:ring-black"
                                />
                                <span className={formData.visibility === "PUBLIC" ? "text-black font-medium" : "text-gray-500"}>
                                    전체 공개
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    checked={formData.visibility === "PRIVATE"}
                                    onChange={() => setFormData({ ...formData, visibility: "PRIVATE" })}
                                    className="w-4 h-4 text-black focus:ring-black"
                                />
                                <span className={formData.visibility === "PRIVATE" ? "text-black font-medium" : "text-gray-500"}>
                                    비공개
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "저장 중..." : "저장하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}
