'use client';

import { ReactNode } from 'react';

type Props = {
    title?: string;
    rightAction?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
};

export default function GalleryPanel({ title, rightAction, children, footer }: Props) {
    return (
        <div className="gallery-panel w-full max-w-6xl mx-auto my-3 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            {/* Panel Header */}
            {(title || rightAction) && (
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    {title && (
                        <h2 className="text-xl font-bold">{title}</h2>
                    )}
                    {rightAction && (
                        <div>{rightAction}</div>
                    )}
                </div>
            )}

            {/* Panel Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {children}
            </div>

            {/* Panel Footer */}
            {footer && (
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-4">
                    {footer}
                </div>
            )}
        </div>
    );
}
