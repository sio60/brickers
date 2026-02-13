'use client';

import React from 'react';
import PuzzleMiniGame from "@/components/kids/PuzzleMiniGame";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
    percent: number;
    jobId?: string;
    age: string;
    agentLogs: string[];
}

export const GenerationLoadingView: React.FC<Props> = ({ percent, jobId, age, agentLogs }) => {
    const { t } = useLanguage();

    const currentMessage = agentLogs.length > 0 ? (() => {
        const last = agentLogs[agentLogs.length - 1];
        const match = last.match(/^\[(.+?)\]\s*/);
        const step = match?.[1];
        return (step && t.sse?.[step]) || last.replace(/^\[.*?\]\s*/, '');
    })() : undefined;

    return (
        <PuzzleMiniGame
            percent={percent}
            jobId={jobId}
            age={age}
            message={currentMessage}
        />
    );
};
