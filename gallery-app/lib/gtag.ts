export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const pageview = (url: string) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            page_path: url,
            debug_mode: true,
        });
        console.info(`🚩 [GA4] Pageview sent to: ${url}`);
    }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: {
    action: string;
    category?: string;
    label?: string;
    value?: number;
}) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
};

/**
 * 로그인한 사용자의 ID를 GA4에 설정합니다 (개인 식별 금지 원칙에 따라 DB ID 사용)
 */
export const setUserId = (userId: string | null) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            user_id: userId,
            debug_mode: true,
        });
        console.info(`📊 [GA4] User ID set to: ${userId}`);
    } else {
        console.warn("⚠️ [GA4] gtag is not defined. Cannot set User ID.");
    }
};

/**
 * 사용자 속성(User Properties)을 설정합니다 (예: nickname, membership 등)
 */
export const setUserProperties = (properties: Record<string, any>) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("set", "user_properties", properties);
        console.info(`📊 [GA4] User Properties set:`, properties);
    }
};
