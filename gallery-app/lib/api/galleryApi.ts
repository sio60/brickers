// Gallery API - 갤러리 관련 함수 및 타입
import { request, API_BASE } from './apiClient';

// 갤러리 응답 타입
export interface GalleryItem {
    id: string;
    authorId: string;
    authorNickname: string;
    authorProfileImage: string;
    title: string;
    content: string;
    tags: string[];
    thumbnailUrl: string;
    ldrUrl?: string;
    sourceImageUrl?: string;
    glbUrl?: string;
    parts?: number;        // 최종 브릭 개수
    screenshotUrls?: Record<string, string>;  // 6면 스크린샷 URL 맵
    isPro?: boolean;       // PRO 모드 여부
    visibility: 'PUBLIC' | 'PRIVATE';
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    dislikeCount: number;
    viewCount: number;
    bookmarked?: boolean;
    myReaction?: 'LIKE' | 'DISLIKE' | null;
}

// 갤러리 등록 요청 타입 (백엔드 스펙)
export interface GalleryCreateRequest {
    jobId?: string;  // 원본 Job ID (중복 등록 방지용)
    title: string;
    content?: string;
    tags?: string[];
    thumbnailUrl?: string;
    ldrUrl?: string;
    sourceImageUrl?: string;
    glbUrl?: string;
    parts?: number;        // 최종 브릭 개수
    screenshotUrls?: Record<string, string>;  // 6면 스크린샷 URL 맵
    visibility?: 'PUBLIC' | 'PRIVATE';
}

// 갤러리 등록 응답 타입
export interface GalleryRegisterResponse {
    id: string;
    title: string;
    thumbnailUrl: string;
}

// 북마크 토글 응답 타입
export interface BookmarkToggleResponse {
    postId: string;
    bookmarked: boolean;
    toggledAt: string;
}

// 내 북마크 아이템 타입
export interface MyBookmarkItem {
    postId: string;
    title: string;
    thumbnailUrl: string;
    tags: string[];
    bookmarkedAt: string;
    postCreatedAt: string;
}

// 반응 타입
export type ReactionType = 'LIKE' | 'DISLIKE';

// 반응 토글 응답 타입
export interface ReactionToggleResponse {
    postId: string;
    myReaction: ReactionType | null;
    likeCount: number;
    dislikeCount: number;
    toggledAt: string;
}

// 갤러리에 작품 등록
export async function registerToGallery(data: GalleryCreateRequest): Promise<any> {
    return request<any>(`${API_BASE}/api/gallery`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// 갤러리 목록 조회 (전체 공개)
export async function getGalleryItems(page = 0, size = 12): Promise<{ content: any[]; totalPages: number }> {
    return request<{ content: any[]; totalPages: number }>(`${API_BASE}/api/gallery?page=${page}&size=${size}`);
}

// 갤러리 상세 조회
export async function getGalleryDetail(postId: string): Promise<GalleryItem> {
    return request<GalleryItem>(`${API_BASE}/api/gallery/${postId}`);
}

// 북마크 토글 (추가/해제)
export async function toggleGalleryBookmark(postId: string): Promise<BookmarkToggleResponse> {
    return request<BookmarkToggleResponse>(`${API_BASE}/api/gallery/${postId}/bookmark`, {
        method: 'POST',
    });
}

// 좋아요/싫어요 토글
export async function toggleGalleryReaction(postId: string, type: ReactionType): Promise<ReactionToggleResponse> {
    return request<ReactionToggleResponse>(`${API_BASE}/api/gallery/${postId}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ type }),
    });
}
