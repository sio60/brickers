'use client';

import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const handleLogin = () => {
        // Navigate to main app with login flag (browser navigation)
        window.location.href = '/?login=true';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{t.loginModal?.title || t.common.loginRequired}</h3>
                    <p className="text-gray-500 mb-6" dangerouslySetInnerHTML={{ __html: (t.loginModal?.bookmarkDesc || '').replace(/\n/g, '<br />') }} />

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleLogin}
                            className="btn-primary w-full"
                        >
                            {t.loginModal?.loginBtn || t.header.login}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                            {t.common.later}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
