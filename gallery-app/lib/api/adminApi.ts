// Admin API - 관리자 관련 함수 및 타입
import { request, API_BASE } from './apiClient';

export interface AdminStats {
    totalUsers: number;
    totalJobs: number;
    totalOrders: number;
    totalGalleryPosts: number;
}

export async function getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>(`${API_BASE}/api/admin/dashboard`);
}

/**
 * AI 서버가 분석한 애널리틱스 리포트를 가져옵니다 (Java 브릿지 경유)
 */
export async function getAiAnalyticsReport(days: number = 7): Promise<{ report: string; days: number }> {
    return request(`${API_BASE}/api/admin/analytics/ai-report?days=${days}`);
}

