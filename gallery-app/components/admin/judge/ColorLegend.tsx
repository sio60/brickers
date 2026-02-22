import React from "react";
import { ISSUE_COLORS, NORMAL_COLOR } from "./constants";

export const ColorLegend = ({ t }: { t: any }) => {
    const items = [
        { color: ISSUE_COLORS.floating, label: t.legend.floating },
        { color: ISSUE_COLORS.isolated, label: t.legend.isolated },
        { color: ISSUE_COLORS.top_only, label: t.legend.topOnly },
        { color: NORMAL_COLOR, label: t.legend.normal },
    ];
    return (
        <div className="flex flex-wrap gap-3 mt-3">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
};
