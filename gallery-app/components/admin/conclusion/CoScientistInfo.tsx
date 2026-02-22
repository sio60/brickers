import React from "react";

interface CoScientistInfoProps {
    coscientist: {
        success: boolean;
        total_attempts: number;
        message: string;
        tool_usage: Record<string, number>;
    };
}

export const CoScientistInfo = ({ coscientist }: CoScientistInfoProps) => {
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                CoScientist 에이전트
            </h3>
            <div className="flex items-center gap-4 mb-3">
                <div className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${coscientist.success
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-700 border-red-100"
                    }`}>
                    {coscientist.success ? "SUCCESS" : "FAILED"}
                </div>
                <span className="text-xs text-gray-500">
                    시도: <span className="font-bold text-gray-900">{coscientist.total_attempts}회</span>
                </span>
            </div>
            {coscientist.message && (
                <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg mb-3">{coscientist.message}</p>
            )}
            {/* 도구 사용 현황 */}
            {Object.keys(coscientist.tool_usage).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(coscientist.tool_usage).map(([tool, count]) => (
                        <span key={tool} className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold border border-purple-100">
                            {tool}: {count}회
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
