export interface VerificationResult {
    is_valid: boolean;
    score: number;
    evidence: Evidence[];
    error?: string;
}

export interface Evidence {
    type: string;
    severity: "CRITICAL" | "WARNING";
    brick_ids: string[];
    message: string;
}

export async function verifyPhysicality(file: File): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append("file", file);

    try {
        // ✅ 환경변수 사용 (배포 시 .env 수정 필요)
        const baseUrl = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/verify`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Verification failed:", error);
        return {
            is_valid: false,
            score: 0,
            evidence: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
