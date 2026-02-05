export type GalleryItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    authorNickname?: string;
    createdAt?: string;
    brickCount?: number;
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
