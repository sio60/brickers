// Upload API - S3 업로드 관련 함수 및 타입
import { request, API_BASE } from './apiClient';

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
