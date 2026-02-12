export const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

/**
 * Determines if a filename represents an LDraw primitive file.
 */
function isPrimitive(filename: string): boolean {
    return /^\d+-\d+/.test(filename) ||
        /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);
}

/**
 * Determines if a filename represents an LDraw subpart file.
 */
function isSubpart(filename: string): boolean {
    return /^\d+s\d+\.dat$/i.test(filename);
}

/**
 * Fixes the LDraw CDN path for a given URL based on the file type
 * (primitive, subpart, or regular part).
 */
function fixLDrawPath(fixed: string, filename: string): string {
    const prim = isPrimitive(filename);
    const sub = isSubpart(filename);

    // Fix incorrect path combinations
    fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
    fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
    fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
    fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
    fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
    fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

    // Primitive in wrong directory → move to /p/
    if (prim && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
        fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
    }
    // Subpart in wrong directory → move to /parts/s/
    if (sub && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
        fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
    }
    // No path at all → add appropriate one
    if (!fixed.includes("/parts/") && !fixed.includes("/p/")) {
        if (sub) fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
        else if (prim) fixed = fixed.replace("/ldraw/", "/ldraw/p/");
        else fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
    }

    return fixed;
}

export interface LDrawURLModifierOptions {
    /** If set, requests for the main model URL will be redirected to this URL instead. */
    overrideMainLdrUrl?: string;
    /** The original main model URL (used to detect redirect targets). */
    mainModelUrl?: string;
    /** Whether to proxy CDN URLs through /api/proxy/ldr. Defaults to true. */
    useProxy?: boolean;
}

/**
 * Creates a URL modifier function for THREE.LoadingManager that handles
 * LDraw path resolution, case normalization, and optional CDN proxying.
 */
export function createLDrawURLModifier(options: LDrawURLModifierOptions = {}): (url: string) => string {
    const { overrideMainLdrUrl, mainModelUrl, useProxy = true } = options;

    // Pre-compute main model absolute URL for redirect matching
    const mainAbs = mainModelUrl ? (() => {
        try { return new URL(mainModelUrl, typeof window !== 'undefined' ? window.location.href : '').href; }
        catch { return mainModelUrl; }
    })() : null;

    return (u: string): string => {
        let fixed = u.replace(/\\/g, "/");

        // Normalize accidental double segments
        fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
        fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

        // Override main model URL if requested
        if (overrideMainLdrUrl && mainAbs) {
            try {
                const abs = new URL(fixed, window.location.href).href;
                if (abs === mainAbs) return overrideMainLdrUrl;
            } catch { /* ignore */ }
        }

        // Resolve relative URLs when using overrideMainLdrUrl
        if (overrideMainLdrUrl && mainModelUrl) {
            const isAbsolute = fixed.startsWith("http") || fixed.startsWith("blob:") || fixed.startsWith("/") || fixed.includes(":");
            if (!isAbsolute) {
                try { fixed = new URL(fixed, mainModelUrl).href; } catch { /* ignore */ }
            }
        }

        // Process LDraw library URLs
        const lowerFixed = fixed.toLowerCase();
        if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
            const filename = fixed.split("/").pop() || "";

            // Normalize filename to lowercase
            const lowerName = filename.toLowerCase();
            if (filename && lowerName !== filename) {
                fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
            }

            fixed = fixLDrawPath(fixed, filename);
        }

        // Proxy CDN URLs
        if (useProxy && fixed.startsWith(CDN_BASE)) {
            return `/api/proxy/ldr?url=${encodeURIComponent(fixed)}`;
        }

        return fixed;
    };
}
