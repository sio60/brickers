'use client';

import React from 'react';
import PuzzleMiniGame from "@/components/kids/PuzzleMiniGame";
import { useLanguage } from "@/contexts/LanguageContext";

import { parseAgentLog } from "@/utils/logParser";

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
        return parseAgentLog(last, t);
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
