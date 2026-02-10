export type GalleryItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    authorId?: string;
    authorNickname?: string;
    authorProfileImage?: string;
    createdAt?: string;
    brickCount?: number;
    parts?: number;        // ✅ 추가: 최종 브릭 개수
    isPro?: boolean;       // ✅ 추가: PRO 모드 여부
    likeCount?: number;
    viewCount?: number;
    commentCount?: number;
    bookmarked?: boolean;
    myReaction?: 'LIKE' | 'DISLIKE' | null;
    ldrUrl?: string;
    glbUrl?: string;
    sourceImageUrl?: string;
};

export type PageResponse<T> = {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    number: number;
};
