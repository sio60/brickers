'use client';

import styles from "./PuzzleMiniGame.module.css";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { savePuzzleRank, getPuzzleRanking, PuzzleRank } from "../../lib/api/kidsApi";
import * as gtag from "../../lib/gtag";

interface PuzzleMiniGameProps {
    percent?: number;
    message?: string;
    jobId?: string;
    age?: string;
}

const SIZE = 3;
const TOTAL_TILES = SIZE * SIZE;
const BACKGROUND_IMAGE = "/game.png";

export default function PuzzleMiniGame({ percent, message, jobId, age }: PuzzleMiniGameProps) {
    const { t } = useLanguage();
    const { user } = useAuth(); // ??????類ｋ궖 揶쎛?紐꾩궎疫?

    // ?????袁⑺뒄 ?怨밴묶 (0 ~ 8)
    const [tiles, setTiles] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isWin, setIsWin] = useState(false);
    const [ranking, setRanking] = useState<PuzzleRank[]>([]);
    const [myRank, setMyRank] = useState<number | null>(null);

    // ?λ뜃由??
    useEffect(() => {
        resetGame();
    }, []);

    // ??????
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isWin) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isWin]);

    const resetGame = useCallback(() => {
        const initialTiles = Array.from({ length: TOTAL_TILES }, (_, i) => i);
        setTiles(initialTiles);
        setMoves(0);
        setSeconds(0);
        setIsActive(false);
        setIsWin(false);
        setMyRank(null);

        // ?酉逾?
        shuffle(initialTiles);
    }, []);

    const shuffle = (array: number[]) => {
        let currentBoard = [...array];
        let emptyPos = currentBoard.indexOf(TOTAL_TILES - 1);

        // 癰귣똻?????깆ス ??욧퍙 揶쎛?關苑???袁る퉸 ?醫륁뒞????猷??곗쨮 ?酉逾?(100??
        for (let i = 0; i < 100; i++) {
            const adjacents = getAdjacents(emptyPos);
            const randomNeighbor = adjacents[Math.floor(Math.random() * adjacents.length)];
            const temp = currentBoard[emptyPos];
            currentBoard[emptyPos] = currentBoard[randomNeighbor];
            currentBoard[randomNeighbor] = temp;
            emptyPos = randomNeighbor;
        }

        setTiles(currentBoard);
        setIsActive(true);

        // [NEW] ?紐껋삋?? 野껊슣????뽰삂
        gtag.trackGameAction("game_start", {
            game_difficulty: "normal", // ?袁⑹삺 3x3 ?⑥쥙??
            wait_time_at_moment: seconds,
            job_id: jobId
        });
    };

    const getAdjacents = (pos: number) => {
        const r = Math.floor(pos / SIZE);
        const c = pos % SIZE;
        const adj = [];
        if (r > 0) adj.push(pos - SIZE);
        if (r < SIZE - 1) adj.push(pos + SIZE);
        if (c > 0) adj.push(pos - 1);
        if (c < SIZE - 1) adj.push(pos + 1);
        return adj;
    };

    const handleTileClick = (pos: number) => {
        if (!isActive || isWin) return;

        const emptyPos = tiles.indexOf(TOTAL_TILES - 1);
        const r1 = Math.floor(pos / SIZE);
        const c1 = pos % SIZE;
        const r2 = Math.floor(emptyPos / SIZE);
        const c2 = emptyPos % SIZE;

        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
            const newTiles = [...tiles];
            const temp = newTiles[pos];
            newTiles[pos] = newTiles[emptyPos];
            newTiles[emptyPos] = temp;
            setTiles(newTiles);
            setMoves(prev => prev + 1);

            // ?諛멤봺 筌ｋ똾寃?
            if (newTiles.every((val, i) => val === i)) {
                handleWin();
            }
        }
    };

    const handleWin = async () => {
        setIsWin(true);
        // 嚥≪뮄??紐껊┷????됱몵筌???곌퐬?????? ?袁⑤빍筌?Guest
        const cachedNickname = localStorage.getItem("nickname");
        const cachedUserId = localStorage.getItem("userId");
        const nickname = user?.nickname || cachedNickname || "Guest";
        const userId = user?.id || cachedUserId || "guest";
        // userId???⑥쥙? ??명?癒? ?袁⑹뒄???筌? API揶쎛 ??곌퐬?袁⑹뱽 ??뽯뻻??뱀몵嚥????롳쭖???곌퐬?袁⑹뱽 癰귣?源?


        try {
            // ??沅?????
            const savedRank = await savePuzzleRank({ userId, nickname, timeSpent: seconds });

            // 筌ㅼ뮇????沅?鈺곌퀬??
            const topRanking = await getPuzzleRanking();
            setRanking(topRanking);

            // ????뽰맄 筌≪뼐由?
            const myIdx = topRanking.findIndex(r => r.id === savedRank.id);
            if (myIdx !== -1) setMyRank(myIdx + 1);

            // [NEW] ?紐껋삋?? 野껊슣???袁⑥┷
            gtag.trackGameAction("game_complete", {
                game_difficulty: "normal",
                game_moves: moves,
                wait_time_at_moment: seconds,
                job_id: jobId,
                rank: myIdx !== -1 ? myIdx + 1 : undefined
            });
        } catch (err) {
            console.error("??沅???뽯뮞????살첒:", err);
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60).toString().padStart(2, '0');
        const secs = (s % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <div className={styles.puzzleGame}>
            {percent !== undefined && (
                <div className={styles.progressContainer}>
                    <div className={styles.progressText}>
                        <span>{message}</span>
                        <span>{percent}%</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            )}

            <div className={styles.gameHeader}>
                <div className={styles.timer}>{formatTime(seconds)}</div>
            </div>

            <div className={styles.gameArea}>
                <div className={styles.board}>
                    {tiles.map((tileIdx, currentPos) => {
                        const isEmpty = tileIdx === TOTAL_TILES - 1;
                        const row = Math.floor(tileIdx / SIZE);
                        const col = tileIdx % SIZE;
                        const posX = (col / (SIZE - 1)) * 100;
                        const posY = (row / (SIZE - 1)) * 100;

                        return (
                            <div
                                key={currentPos}
                                className={`${styles.tile} ${isEmpty ? styles.tileEmpty : ""}`}
                                style={!isEmpty ? {
                                    backgroundImage: `url(${BACKGROUND_IMAGE})`,
                                    backgroundPosition: `${posX}% ${posY}%`,
                                    backgroundSize: `${SIZE * 100}% ${SIZE * 100}%`
                                } : {}}
                                onClick={() => handleTileClick(currentPos)}
                            >
                                {!isEmpty && tileIdx + 1}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.referenceSection}>
                    <span className={styles.referenceLabel}>원본</span>
                    <img
                        src={BACKGROUND_IMAGE}
                        alt="원본 이미지"
                        className={styles.referenceImage}
                    />
                </div>
            </div>

            {isWin && (
                <div className={styles.overlay}>
                    <div className={styles.victoryCard}>
                        <h2>축하합니다</h2>
                        <div className={styles.victoryStats}>
                            <p>기록: {formatTime(seconds)} ({moves}회 이동)</p>
                            {myRank && <p>현재 랭킹 <strong>{myRank}위</strong>입니다</p>}
                        </div>

                        <div className={styles.rankingList}>
                            <p style={{ fontWeight: 'bold', marginBottom: 10 }}>TOP 10 랭킹</p>
                            {ranking.map((r, i) => (
                                <div
                                    key={r.id || i}
                                    className={styles.rankingItem}
                                    style={i + 1 === myRank ? { background: '#f5f5f5', fontWeight: 'bold' } : {}}
                                >
                                    <span>
                                        <span className={styles.rankNumber}>{i + 1}</span>
                                        {r.nickname || r.userId}
                                    </span>
                                    <span>{formatTime(r.timeSpent)}</span>
                                </div>
                            ))}
                        </div>

                        <button className={styles.restartBtn} onClick={resetGame}>다시 하기</button>
                    </div>
                </div>
            )}
        </div>
    );
}

