'use client';

import { useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import BrickStackMiniGame from "./BrickStackMiniGame";
import { requestNotificationPermission, showToastNotification } from "../../lib/toast-utils";

interface KidsLoadingScreenProps {
    percent: number;
}

export default function KidsLoadingScreen({ percent }: KidsLoadingScreenProps) {
    const { t } = useLanguage();
    const hasNotified = useRef(false);

    useEffect(() => {
        // 컴포넌트 마운트 시 권한 요청
        requestNotificationPermission();
    }, []);

    useEffect(() => {
        if (percent >= 100 && !hasNotified.current) {
            showToastNotification(
                t.kids?.generate?.completeTitle || "생성 완료!",
                t.kids?.generate?.completeBody || "브릭 모델 생성이 완료되었습니다. 확인해보세요!",
                "/logo.png"
            );
            hasNotified.current = true;
        }
    }, [percent, t]);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            {/* 프로그레스 바 */}
            <div className="w-full max-w-md">
                <span className="block text-lg font-bold text-gray-800 mb-2">
                    {t.kids?.generate?.creating || "Creating your brick model..."}
                </span>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="text-sm text-gray-500 mt-1 text-right">{percent}%</div>
            </div>

            {/* 게임 영역 */}
            <div className="w-full max-w-md">
                <BrickStackMiniGame />
            </div>
        </div>
    );
}
