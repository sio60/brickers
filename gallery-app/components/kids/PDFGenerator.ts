export interface StepImageItem {
    stepIndex: number;
    images: string[]; // Base64
}

export interface PdfWithBomRequest {
    modelName: string;
    ldrUrl: string;
    steps: StepImageItem[];
    coverImage?: string;
}

export interface PdfWithBomResponse {
    ok: boolean;
    pdfUrl: string;
    message?: string;
}

/**
 * 서버 API를 호출하여 PDF를 생성합니다.
 * @param ldrUrl LDR 파일 URL
 * @param modelName 모델 이름
 * @param stepImages 캡처된 스텝별 이미지 리스트 [[v1, v2, v3], ...]
 */
export async function generatePdfFromServer(
    ldrUrl: string,
    modelName: string,
    stepImages: string[][]
): Promise<string> {

    // Request Body 구성
    const steps: StepImageItem[] = stepImages.map((imgs, idx) => ({
        stepIndex: idx + 1,
        images: imgs
    }));

    // 커버 이미지는 마지막 스텝의 첫 번째 뷰 사용 (또는 별도 캡처)
    const coverImage = stepImages.length > 0 && stepImages[stepImages.length - 1].length > 0
        ? stepImages[stepImages.length - 1][0]
        : undefined;

    const payload: PdfWithBomRequest = {
        modelName,
        ldrUrl,
        steps,
        coverImage
    };

    try {
        const res = await fetch(`/api/instructions/pdf-with-bom`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server error: ${res.status}`);
        }

        const data: PdfWithBomResponse = await res.json();
        return data.pdfUrl;
    } catch (e) {
        console.error("PDF Generation Failed:", e);
        throw e;
    }
}
