export const GA_TRACKING_ID = process.env['NEXT_PUBLIC_GA_ID'] || "";
// if (typeof window !== "undefined") {
//     console.log(`📡 [GA4] Tracking ID loaded: ${GA_TRACKING_ID}`);
// }

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const pageview = (url: string) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            page_path: url,
            debug_mode: true, // GA4 실시간 DebugView 확인을 위해 활성화
        });
        // console.info(`🚩 [GA4] Pageview sent to: ${url}`);
    }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value, ...rest }: {
    action: string;
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
}) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", action, {
            event_category: category,
            event_label: label,
            value: value,
            ...rest,
        });
    }
};

/**
 * 로그인한 사용자의 ID를 GA4에 설정합니다.
 */
export const setUserId = (userId: string | null) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            user_id: userId,
            debug_mode: true,
        });
    }
};

/**
 * 사용자 속성(User Properties)을 일괄 설정합니다.
 * ga4_custom_definition_guide.md에 정의된 속성들 대응
 */
export const setUserProperties = (properties: {
    membership_status?: "Free" | "Premium" | "Pro";
    total_generated_count?: number;
    preferred_theme?: string;
    last_event_participation?: string;
    total_pdf_downloads?: number;
    [key: string]: any;
}) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("set", "user_properties", properties);
    }
};

/**
 * 브릭 생성 라이프사이클 트래킹
 */
export const trackGeneration = (status: "start" | "success" | "fail", params: {
    job_id: string;
    age?: string;
    image_category?: string;
    stability_score?: number;
    wait_time?: number;
    est_cost?: number;
    error_type?: string;
    brick_count?: number;
    [key: string]: any;
}) => {
    event({
        action: `generate_${status}`,
        category: "Generation",
        label: params.job_id,
        ...params
    });
};

/**
 * 게이미피케이션(미니게임) 트래킹
 */
export const trackGameAction = (action: "game_start" | "game_complete" | "game_exit", params: {
    game_difficulty?: string;
    game_moves?: number;
    wait_time_at_moment?: number;
    [key: string]: any;
}) => {
    event({
        action: action,
        category: "Gamification",
        ...params
    });
};

/**
 * 트렌드 및 유저 피드백 트래킹
 */
export const trackUserFeedback = (params: {
    action: "search" | "rate" | "download" | "share";
    search_term?: string;
    star_rating?: number;
    job_id?: string;
    [key: string]: any;
}) => {
    const { action, ...rest } = params;
    event({
        action: `user_${action}`,
        category: "Feedback",
        ...rest
    });
};
