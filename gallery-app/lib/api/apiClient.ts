// API Client - 공통 유틸리티 (ApiError, request, getHeaders 등)
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}

// 인증 토큰 가져오기
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
}

// API 헤더 생성
export function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// 공통 요청 핸들러
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
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
