"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import * as gtag from "@/lib/gtag";

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
        gtag.pageview(pathname);
    }, [pathname]);

    return null;
}
