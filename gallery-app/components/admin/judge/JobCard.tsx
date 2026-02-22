import React from "react";
import { JobListItem } from "@/types/judge";

interface JobCardProps {
    job: JobListItem;
    selected: boolean;
    onSelect: () => void;
}

export const JobCard = ({
    job,
    selected,
    onSelect,
}: JobCardProps) => {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 rounded-lg border transition-all ${selected
                ? "border-black bg-gray-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
        >
            <div className="flex items-center gap-3">
                {(job.previewImageUrl || job.sourceImageUrl) ? (
                    <img
                        src={job.previewImageUrl || job.sourceImageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                        LDR
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        {job.userInfo?.profileImage ? (
                            <img src={job.userInfo.profileImage} alt="" className="w-4 h-4 rounded-full" />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                        )}
                        <span className="text-xs text-gray-500 truncate">{job.userInfo?.nickname || "Unknown"}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.title || "Untitled"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </button>
    );
};
