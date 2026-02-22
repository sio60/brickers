import React from "react";

interface GalleryPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}

export const GalleryPagination = ({
    page,
    totalPages,
    onPageChange,
}: GalleryPaginationProps) => {
    return (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-xl border border-t-0 border-gray-200">
            <button
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 text-gray-600 font-medium transition-colors"
            >
                Previous
            </button>
            <span className="text-xs text-gray-500 font-medium">Page {page + 1} of {totalPages || 1}</span>
            <button
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 text-gray-600 font-medium transition-colors"
            >
                Next
            </button>
        </div>
    );
};
