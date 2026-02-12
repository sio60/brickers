import * as THREE from "three";
import { CDN_BASE } from "@/lib/ldrawUrlModifier";

/**
 * Preload LDraw parts bundle into THREE.Cache.
 *
 * Derives the bundle URL from the LDR URL by replacing the filename
 * with `parts-bundle.json` (same S3 directory).
 *
 * If the bundle exists, all part contents are injected into THREE.Cache
 * under both CDN and proxy URL keys, so LDrawLoader gets cache hits
 * instead of making individual HTTP requests.
 *
 * @returns true if bundle was loaded, false if not found (404 → CDN fallback)
 */
export async function preloadPartsBundle(ldrUrl: string): Promise<boolean> {
    if (!ldrUrl) return false;

    // Only process direct S3 URLs — skip blob, proxy, relative paths
    try {
        const parsed = new URL(ldrUrl, window.location.origin);
        if (!parsed.hostname.includes("amazonaws.com")) return false;
    } catch {
        return false;
    }

    const bundleUrl = ldrUrl.replace(/\/[^/]+$/, "/parts-bundle.json");

    try {
        const res = await fetch(bundleUrl);
        if (!res.ok) return false; // 404 → existing models without bundle

        const bundle: {
            version: number;
            ldconfig: string;
            parts: Record<string, string>;
        } = await res.json();

        THREE.Cache.enabled = true;

        // Inject each part into cache under both CDN URL and proxy URL keys
        for (const [relPath, content] of Object.entries(bundle.parts)) {
            const cdnUrl = CDN_BASE + relPath;
            const proxyUrl = `/api/proxy/ldr?url=${encodeURIComponent(cdnUrl)}`;
            THREE.Cache.add(cdnUrl, content);
            THREE.Cache.add(proxyUrl, content);
        }

        // Inject LDConfig.ldr
        if (bundle.ldconfig) {
            const ldconfigCdn = CDN_BASE + "LDConfig.ldr";
            const ldconfigProxy = `/api/proxy/ldr?url=${encodeURIComponent(ldconfigCdn)}`;
            THREE.Cache.add(ldconfigCdn, bundle.ldconfig);
            THREE.Cache.add(ldconfigProxy, bundle.ldconfig);
        }

        console.log(`[LDraw Bundle] Loaded ${Object.keys(bundle.parts).length} parts from bundle`);
        return true;
    } catch (e) {
        console.warn("[LDraw Bundle] Failed to load bundle, falling back to CDN:", e);
        return false;
    }
}
