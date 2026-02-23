'use client';

type Props = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
    // Don't render if only one page or no pages
    if (totalPages <= 1) return null;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(0);

            if (currentPage > 2) {
                pages.push('ellipsis');
            }

            // Show pages around current
            const start = Math.max(1, currentPage - 1);
            const end = Math.min(totalPages - 2, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 3) {
                pages.push('ellipsis');
            }

            // Always show last page
            if (!pages.includes(totalPages - 1)) {
                pages.push(totalPages - 1);
            }
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-center gap-2">
            {/* Previous arrow */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-medium transition-colors
                    ${currentPage === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                aria-label="Previous page"
            >
                &lt;
            </button>

            {/* Page numbers */}
            {pageNumbers.map((page, index) => {
                if (page === 'ellipsis') {
                    return (
                        <span
                            key={`ellipsis-${index}`}
                            className="w-10 h-10 flex items-center justify-center text-gray-400"
                        >
                            ...
                        </span>
                    );
                }

                const isCurrentPage = page === currentPage;
                return (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                            ${isCurrentPage
                                ? 'bg-black text-white'
                                : 'text-gray-600 border border-gray-300 hover:bg-gray-100'
                            }`}
                        aria-label={`Page ${page + 1}`}
                        aria-current={isCurrentPage ? 'page' : undefined}
                    >
                        {page + 1}
                    </button>
                );
            })}

            {/* Next arrow */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-medium transition-colors
                    ${currentPage === totalPages - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                aria-label="Next page"
            >
                &gt;
            </button>
        </div>
    );
}
