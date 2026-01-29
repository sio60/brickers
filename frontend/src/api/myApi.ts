// My API 서비스 - 프로필, 작업 관리
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

console.debug("[myApi] API_BASE is set to:", API_BASE);

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}

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
    modelKey?: string; // ✅ 추가
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

// ✅ 기존 localStorage 기반 토큰 가져오기 제거
// 인증 헤더 생성 (AuthContext의 fetch를 사용하도록 유도하거나, 여기서는 헤더만 정의)
function getHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
    };
}

// 공통 요청 핸들러
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...getHeaders(),
                ...options.headers,
            },
            credentials: 'include',
        });

        if (!res.ok) {
            // 에러 메시지 추출 시도
            // 에러 메시지 추출 시도
            let errorMessage = '요청 실패';
            try {
                const errorText = await res.text();
                try {
                    const errorData = JSON.parse(errorText);
                    // 백엔드 ApiError 구조: { message: "...", error: "...", ... }
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {
                    // JSON이 아니면 텍스트 그대로 사용 (HTML 에러 등 방지 위해 길이 제한)
                    if (errorText && errorText.length < 200) {
                        errorMessage = errorText;
                    }
                }
            } catch {
                // 본문 읽기 실패 시 무시
            }
            throw new ApiError(errorMessage, res.status);
        }

        // 응답이 없는 경우 (204 No Content 등) 처리
        if (res.status === 204) return {} as T;

        return res.json();
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        // 네트워크 에러 등
        throw new ApiError(err instanceof Error ? err.message : '네트워크 에러', 0);
    }
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

// 갤러리 등록 응답 타입
export interface GalleryRegisterResponse {
    id: string;
    title: string;
    thumbnailUrl: string;
}

// 갤러리 등록 요청 타입 (백엔드 스펙)
export interface GalleryCreateRequest {
    title: string;
    content?: string;
    tags?: string[];
    thumbnailUrl?: string;
    ldrUrl?: string; // LDR 파일 URL (3D 뷰어용)
    visibility?: 'PUBLIC' | 'PRIVATE';
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

// 내 갤러리 목록 조회
export async function getMyGalleryItems(page = 0, size = 12): Promise<{ content: any[]; totalPages: number }> {
    return request<{ content: any[]; totalPages: number }>(`${API_BASE}/api/gallery/my?page=${page}&size=${size}`);
}

// 내 북마크 목록 조회
export async function getMyBookmarks(page = 0, size = 12): Promise<{ content: MyBookmarkItem[]; totalPages: number }> {
    return request<{ content: MyBookmarkItem[]; totalPages: number }>(`${API_BASE}/api/gallery/bookmarks/my?page=${page}&size=${size}`);
}

// ========== 갤러리 상세 & 상호작용 API ==========

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
    ldrUrl?: string; // LDR 파일 URL (3D 뷰어용)
    visibility: 'PUBLIC' | 'PRIVATE';
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    dislikeCount: number;
    viewCount: number;
    // ✅ 추가: 현재 사용자의 북마크/반응 상태
    bookmarked?: boolean;
    myReaction?: 'LIKE' | 'DISLIKE' | null;
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

// 작업 재시도 (중단된 작업 이어하기)
export async function retryJob(jobId: string): Promise<MyJob> {
    return request<MyJob>(`${API_BASE}/api/my/jobs/${jobId}/retry`, {
        method: 'POST',
    });
}

// 프로필 수정 요청 타입
export interface MyProfileUpdateRequest {
    nickname?: string;
    bio?: string;
    profileImage?: string;
}

// 프로필 수정
export async function updateMyProfile(data: MyProfileUpdateRequest): Promise<MyProfile> {
    return request<MyProfile>(`${API_BASE}/api/my/profile`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// S3 presign 응답 타입
export interface PresignResponse {
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresInSeconds: number;
}

// S3 presign URL 요청
export async function getPresignUrl(contentType: string, originalName: string): Promise<PresignResponse> {
    return request<PresignResponse>(`${API_BASE}/api/uploads/presign`, {
        method: 'POST',
        body: JSON.stringify({ contentType, originalName }),
    });
}

// S3에 이미지 업로드 (presign URL 사용)
export async function uploadImageToS3(file: File): Promise<string> {
    // 1. presign URL 요청
    const presign = await getPresignUrl(file.type, file.name);

    // 2. S3에 직접 업로드 (Direct fetch usage as it's external URL)
    const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    if (!uploadRes.ok) throw new Error('S3 업로드 실패');

    // 3. 공개 URL 반환
    return presign.publicUrl;
}

export interface AdminStats {
    totalUsers: number;
    totalJobs: number;
    totalOrders: number;
    totalGalleryPosts: number;
}

export async function getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>(`${API_BASE}/api/admin/dashboard`);
}
