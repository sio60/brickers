'use client';

import { useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import PuzzleMiniGame from "./PuzzleMiniGame";
import { requestNotificationPermission, showToastNotification } from "../../lib/toast-utils";

interface KidsLoadingScreenProps {
    percent: number;
    message?: string;
}

export default function KidsLoadingScreen({ percent, message }: KidsLoadingScreenProps) {
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
        <PuzzleMiniGame
            percent={percent}
            message={message || t.kids?.generate?.creating || "Creating your brick model..."}
        />
    );
}
