// User API - 프로필, 작업 관리 함수 및 타입
import { request, API_BASE } from './apiClient';
import type { MyBookmarkItem } from './galleryApi';

export interface MyProfile {
    id: string;
    email: string;
    nickname: string;
    bio: string;
    profileImage: string;
    membershipPlan: string;
    accountState: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
}

export interface MyJob {
    id: string;
    level: string;
    status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELED';
    stage: string;
    title: string;
    sourceImageUrl: string;
    previewImageUrl: string;
    correctedImageUrl?: string;
    glbUrl?: string;
    ldrUrl?: string; // LDR 파일 URL (백엔드 MyJobResponse와 일치)
    instructionsPdfUrl?: string; // PDF 파일 URL
    suggestedTags?: string[];  // Gemini가 추천한 태그 목록
    screenshotUrls?: Record<string, string>;  // 6면 스크린샷 URL 맵
    parts?: number;            // 최종 브릭 개수
    finalTarget?: number;      // 최종 해상도
    isPro?: boolean;           // PRO 모드 여부
    hasResult: boolean;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
    stageUpdatedAt: string;
}

export interface MyOverview {
    settings: {
        email: string;
        nickname: string;
        profileImage: string;
        membershipPlan: string;
    };
    gallery: {
        totalCount: number;
        recent: Array<{ id: string; title: string; thumbnailUrl: string }>;
    };
    jobs: {
        totalCount: number;
        recent: MyJob[];
    };
}

// 프로필 수정 요청 타입
export interface MyProfileUpdateRequest {
    nickname?: string;
    bio?: string;
    profileImage?: string;
}

// 내 프로필 조회
export async function getMyProfile(): Promise<MyProfile> {
    return request<MyProfile>(`${API_BASE}/api/my/profile`);
}

// 마이페이지 전체 조회 (프로필+갤러리+작업)
export async function getMyOverview(): Promise<MyOverview> {
    return request<MyOverview>(`${API_BASE}/api/my/overview`);
}

// 내 작업 목록 조회
export async function getMyJobs(page = 0, size = 12): Promise<{ content: MyJob[]; totalPages: number }> {
    return request<{ content: MyJob[]; totalPages: number }>(`${API_BASE}/api/my/jobs?page=${page}&size=${size}`);
}

// 내 갤러리 목록 조회
export async function getMyGalleryItems(page = 0, size = 12): Promise<{ content: any[]; totalPages: number }> {
    return request<{ content: any[]; totalPages: number }>(`${API_BASE}/api/gallery/my?page=${page}&size=${size}`);
}

// 내 북마크 목록 조회
export async function getMyBookmarks(page = 0, size = 12): Promise<{ content: MyBookmarkItem[]; totalPages: number }> {
    return request<{ content: MyBookmarkItem[]; totalPages: number }>(`${API_BASE}/api/gallery/bookmarks/my?page=${page}&size=${size}`);
}

// 내 문의 내역 조회
export async function getMyInquiries(page = 0, size = 20): Promise<{ content: any[]; totalPages: number }> {
    return request<{ content: any[]; totalPages: number }>(`${API_BASE}/api/inquiries/my?page=${page}&size=${size}`);
}

// 내 신고 내역 조회
export async function getMyReports(page = 0, size = 20): Promise<{ content: any[]; totalPages: number }> {
    return request<{ content: any[]; totalPages: number }>(`${API_BASE}/api/reports/my?page=${page}&size=${size}`);
}

// 프로필 수정
export async function updateMyProfile(data: MyProfileUpdateRequest): Promise<MyProfile> {
    return request<MyProfile>(`${API_BASE}/api/my/profile`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// 작업 재시도 (중단된 작업 이어하기)
export async function retryJob(jobId: string): Promise<MyJob> {
    return request<MyJob>(`${API_BASE}/api/my/jobs/${jobId}/retry`, {
        method: 'POST',
    });
}

// 작업 취소
export async function cancelJob(jobId: string): Promise<MyJob> {
    return request<MyJob>(`${API_BASE}/api/my/jobs/${jobId}/cancel`, {
        method: 'POST',
    });
}
