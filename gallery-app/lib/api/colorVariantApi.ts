// Color Variant API 서비스 - 색상 테마 변경
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

// 테마 정보
export interface ThemeInfo {
    name: string;
    description: string;
}

// 색상 변경 응답
export interface ColorVariantResponse {
    ok: boolean;
    message: string;
    themeApplied: string;
    originalColors: number;
    changedBricks: number;
    ldrData: string; // base64 encoded LDR
}

/**
 * 사용 가능한 색상 테마 목록 조회
 */
export async function getColorThemes(): Promise<ThemeInfo[]> {
    const res = await fetch(`${API_BASE}/api/color-variant/themes`);
    if (!res.ok) throw new Error('테마 목록 조회 실패');
    return res.json();
}

/**
 * LDR 파일에 색상 테마 적용
 */
export async function applyColorVariant(ldrUrl: string, theme: string): Promise<ColorVariantResponse> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const res = await fetch(`${API_BASE}/api/color-variant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ ldrUrl, theme }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '색상 변경 실패');
    }

    return res.json();
}

/**
 * Base64 LDR 데이터를 Blob URL로 변환 (뷰어용)
 */
export function base64ToBlobUrl(base64Data: string): string {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'text/plain' });
    return URL.createObjectURL(blob);
}

/**
 * Base64 LDR 데이터를 다운로드
 */
export function downloadLdrFromBase64(base64Data: string, filename: string): void {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
