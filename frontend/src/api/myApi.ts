// My API 서비스 - 프로필, 작업 관리
// ✅ authFetch 기반으로 리팩터링 - 토큰 자동 관리

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

// ✅ AuthContext의 authFetch 타입
export type AuthFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

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
    correctedImageUrl?: string;
    glbUrl?: string;
    ldrUrl?: string; // LDR 파일 URL (백엔드 MyJobResponse와 일치)
    parts?: number;        // ✅ 추가: 최종 브릭 개수
    finalTarget?: number;  // ✅ 추가: 최종 타겟 해상도
    isPro?: boolean;       // ✅ 추가: PRO 모드 여부
    suggestedTags?: string[]; // ✅ Gemini 추천 태그
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
    ldrUrl?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
}

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
    parts?: number;        // ✅ 추가: 최종 브릭 개수
    isPro?: boolean;       // ✅ 추가: PRO 모드 여부
    visibility: 'PUBLIC' | 'PRIVATE';
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    dislikeCount: number;
    viewCount: number;
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

// 프로필 수정 요청 타입
export interface MyProfileUpdateRequest {
    nickname?: string;
    bio?: string;
    profileImage?: string;
}

// S3 presign 응답 타입
export interface PresignResponse {
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresInSeconds: number;
}

export interface AdminStats {
    totalUsers: number;
    totalJobs: number;
    totalOrders: number;
    totalGalleryPosts: number;
}

// ✅ 에러 추출 헬퍼
async function extractError(res: Response): Promise<ApiError> {
    let errorMessage = '요청 실패';
    try {
        const errorText = await res.text();
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            if (errorText && errorText.length < 200) {
                errorMessage = errorText;
            }
        }
    } catch {
        // ignore
    }
    return new ApiError(errorMessage, res.status);
}

// ✅ Factory 패턴: authFetch를 받아서 API 객체 생성
export function createMyApi(authFetch: AuthFetchFn) {
    return {
        // 내 프로필 조회
        async getMyProfile(): Promise<MyProfile> {
            const res = await authFetch(`${API_BASE}/api/my/profile`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 마이페이지 전체 조회
        async getMyOverview(): Promise<MyOverview> {
            const res = await authFetch(`${API_BASE}/api/my/overview`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 내 작업 목록 조회
        async getMyJobs(page = 0, size = 12): Promise<{ content: MyJob[]; totalPages: number }> {
            const res = await authFetch(`${API_BASE}/api/my/jobs?page=${page}&size=${size}`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 갤러리에 작품 등록
        async registerToGallery(data: GalleryCreateRequest): Promise<any> {
            const res = await authFetch(`${API_BASE}/api/gallery`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 갤러리 목록 조회 (전체 공개)
        async getGalleryItems(page = 0, size = 12): Promise<{ content: any[]; totalPages: number }> {
            const res = await authFetch(`${API_BASE}/api/gallery?page=${page}&size=${size}`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 내 갤러리 목록 조회
        async getMyGalleryItems(page = 0, size = 12): Promise<{ content: any[]; totalPages: number }> {
            const res = await authFetch(`${API_BASE}/api/gallery/my?page=${page}&size=${size}`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 내 북마크 목록 조회
        async getMyBookmarks(page = 0, size = 12): Promise<{ content: MyBookmarkItem[]; totalPages: number }> {
            const res = await authFetch(`${API_BASE}/api/gallery/bookmarks/my?page=${page}&size=${size}`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 갤러리 상세 조회
        async getGalleryDetail(postId: string): Promise<GalleryItem> {
            const res = await authFetch(`${API_BASE}/api/gallery/${postId}`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 북마크 토글
        async toggleGalleryBookmark(postId: string): Promise<BookmarkToggleResponse> {
            const res = await authFetch(`${API_BASE}/api/gallery/${postId}/bookmark`, {
                method: 'POST',
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 좋아요/싫어요 토글
        async toggleGalleryReaction(postId: string, type: ReactionType): Promise<ReactionToggleResponse> {
            const res = await authFetch(`${API_BASE}/api/gallery/${postId}/reaction`, {
                method: 'POST',
                body: JSON.stringify({ type }),
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 작업 재시도
        async retryJob(jobId: string): Promise<MyJob> {
            const res = await authFetch(`${API_BASE}/api/my/jobs/${jobId}/retry`, {
                method: 'POST',
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // 프로필 수정
        async updateMyProfile(data: MyProfileUpdateRequest): Promise<MyProfile> {
            const res = await authFetch(`${API_BASE}/api/my/profile`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // S3 presign URL 요청
        async getPresignUrl(contentType: string, originalName: string): Promise<PresignResponse> {
            const res = await authFetch(`${API_BASE}/api/uploads/presign`, {
                method: 'POST',
                body: JSON.stringify({ contentType, originalName }),
            });
            if (!res.ok) throw await extractError(res);
            return res.json();
        },

        // S3에 이미지 업로드
        async uploadImageToS3(file: File): Promise<string> {
            const presign = await this.getPresignUrl(file.type, file.name);
            const uploadRes = await fetch(presign.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!uploadRes.ok) throw new Error('S3 업로드 실패');
            return presign.publicUrl;
        },

        // Admin 통계
        async getAdminStats(): Promise<AdminStats> {
            const res = await authFetch(`${API_BASE}/api/admin/dashboard`);
            if (!res.ok) throw await extractError(res);
            return res.json();
        },
    };
}

// ✅ API 객체 타입 export
export type MyApiInstance = ReturnType<typeof createMyApi>;
