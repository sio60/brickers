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
