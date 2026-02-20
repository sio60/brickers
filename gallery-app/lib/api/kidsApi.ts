import { API_BASE, request } from './apiClient';

export interface PuzzleRank {
    id: string;
    userId: string;
    email: string;
    nickname: string;
    timeSpent: number;
    createdAt: string;
}

export interface PuzzleRankRequest {
    userId: string;
    nickname?: string;
    timeSpent: number;
}

/**
 * 퍼즐 랭킹 기록 저장
 */
export async function savePuzzleRank(rankReq: PuzzleRankRequest): Promise<PuzzleRank> {
    return request<PuzzleRank>(`${API_BASE}/api/kids/puzzle/rank`, {
        method: 'POST',
        body: JSON.stringify(rankReq),
    });
}

/**
 * 상위 랭킹 조회
 */
export async function getPuzzleRanking(): Promise<PuzzleRank[]> {
    return request<PuzzleRank[]>(`${API_BASE}/api/kids/puzzle/ranking`, {
        method: 'GET',
    });
}
