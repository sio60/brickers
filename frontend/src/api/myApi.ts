// My API 서비스 - 프로필, 작업 관리
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface MyProfile {
    id: string;
    email: string;
    nickname: string;
    bio: string;
    profileImage: string;
    membershipPlan: string;
    accountState: string;
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

// 인증 토큰 가져오기
function getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
}

// API 헤더 생성
function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// 내 프로필 조회
export async function getMyProfile(): Promise<MyProfile> {
    const res = await fetch(`${API_BASE}/api/my/profile`, {
        headers: getHeaders(),
        credentials: 'include',
    });
    if (!res.ok) throw new Error('프로필 조회 실패');
    return res.json();
}

// 마이페이지 전체 조회 (프로필+갤러리+작업)
export async function getMyOverview(): Promise<MyOverview> {
    const res = await fetch(`${API_BASE}/api/my/overview`, {
        headers: getHeaders(),
        credentials: 'include',
    });
    if (!res.ok) throw new Error('마이페이지 조회 실패');
    return res.json();
}

// 내 작업 목록 조회
export async function getMyJobs(page = 0, size = 12): Promise<{ content: MyJob[]; totalPages: number }> {
    const res = await fetch(`${API_BASE}/api/my/jobs?page=${page}&size=${size}`, {
        headers: getHeaders(),
        credentials: 'include',
    });
    if (!res.ok) throw new Error('작업 목록 조회 실패');
    return res.json();
}

// 작업 재시도 (중단된 작업 이어하기)
export async function retryJob(jobId: string): Promise<MyJob> {
    const res = await fetch(`${API_BASE}/api/my/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
    });
    if (!res.ok) throw new Error('작업 재시도 실패');
    return res.json();
}

// 프로필 수정 요청 타입
export interface MyProfileUpdateRequest {
    nickname?: string;
    bio?: string;
    profileImage?: string;
}

// 프로필 수정
export async function updateMyProfile(data: MyProfileUpdateRequest): Promise<MyProfile> {
    const res = await fetch(`${API_BASE}/api/my/profile`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('프로필 수정 실패');
    return res.json();
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
    const res = await fetch(`${API_BASE}/api/uploads/presign`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ contentType, originalName }),
    });
    if (!res.ok) throw new Error('Presign URL 생성 실패');
    return res.json();
}

// S3에 이미지 업로드 (presign URL 사용)
export async function uploadImageToS3(file: File): Promise<string> {
    // 1. presign URL 요청
    const presign = await getPresignUrl(file.type, file.name);

    // 2. S3에 직접 업로드
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
