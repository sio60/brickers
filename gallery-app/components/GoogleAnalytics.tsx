"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const GA_ID = "G-GHSB43V8CL";

declare global {
    interface Window {
        gtag: (
            command: "config" | "event" | "js",
            targetId: string,
            config?: Record<string, any>
        ) => void;
    }
}

export default function GoogleAnalytics() {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("config", GA_ID, {
                page_path: pathname,
            });
        }
    }, [pathname]);

    return null;
}
