'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Delays loading of LDraw 3D content until the container enters the viewport.
 * Returns a ref to attach to the container element, and a boolean indicating
 * whether the element is visible (i.e. loading should begin).
 */
export function useLazyLDrawLoader(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || isVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px', ...options }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [isVisible, options]);

    return { ref, isVisible };
}
