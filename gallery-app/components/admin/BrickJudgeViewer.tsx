"use client";

import { useEffect, useRef, useState } from "react";

export default function BrickJudgeViewer() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Iframe URL (Proxied via Next.js to avoid CORS/Mixed Content)
    const VIEWER_URL = "/api/judge-viewer";

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 text-sm">Loading Brick Judge...</p>
                    </div>
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={VIEWER_URL}
                className="w-full h-full border-0"
                title="Brick Judge Viewer"
                onLoad={() => setIsLoaded(true)}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}
