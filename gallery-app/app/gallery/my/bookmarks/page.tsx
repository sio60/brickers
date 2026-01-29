'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookmarksRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to /gallery/my with bookmarks tab
        router.replace('/gallery/my');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
        </div>
    );
}
