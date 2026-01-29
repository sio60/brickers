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
        <div className="gallery-panel w-full max-w-6xl mx-auto my-8 overflow-hidden">
            {/* Panel Header */}
            {(title || rightAction) && (
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    {title && (
                        <h2 className="text-2xl font-bold">{title}</h2>
                    )}
                    {rightAction && (
                        <div>{rightAction}</div>
                    )}
                </div>
            )}

            {/* Panel Body */}
            <div className="p-6">
                {children}
            </div>

            {/* Panel Footer */}
            {footer && (
                <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-center gap-4">
                    {footer}
                </div>
            )}
        </div>
    );
}
