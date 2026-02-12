export type BrickIssue = {
    brick_id: number | null;
    type: "floating" | "isolated" | "top_only" | "unstable_base";
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    color: string;
    data?: Record<string, any>;
};

export type JudgeResult = {
    model_name: string;
    brick_count: number;
    score: number;
    stable: boolean;
    issues: BrickIssue[];
    brick_colors: Record<number, string>;
    elapsed_ms: number;
    backend: string;
    ldr_content: string;
};

export type JobListItem = {
    id: string;
    userId: string;
    userInfo?: {
        id: string;
        email: string;
        nickname: string;
        profileImage: string;
    };
    title: string;
    ldrUrl: string;
    sourceImageUrl: string;
    previewImageUrl: string;
    createdAt: string;
};
