import * as THREE from "three";

export type LdrStepData = {
    stepTexts: string[];
    bounds: THREE.Box3 | null;
};

export function parseAndProcessSteps(ldrText: string): LdrStepData {
    const lines = ldrText.replace(/\r\n/g, "\n").split("\n");

    // 1. 전체 Bounds 계산 및 Step 분리
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const segments: { lines: string[]; avgY: number }[] = [];
    let curLines: string[] = [];
    let curYSum = 0;
    let curCount = 0;

    let hasStep = false;

    const flush = () => {
        const avgY = curCount > 0 ? curYSum / curCount : -Infinity;
        segments.push({ lines: curLines, avgY });
        curLines = [];
        curYSum = 0;
        curCount = 0;
    };

    for (const raw of lines) {
        const line = raw.trim();

        // Step 구분
        if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
            hasStep = true;
            flush();
            continue;
        }

        // 부품 라인 파싱 (Type 1)
        if (line.startsWith('1 ')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 15) {
                const x = parseFloat(parts[2]);
                const y = parseFloat(parts[3]);
                const z = parseFloat(parts[4]);

                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
                    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);

                    curYSum += y;
                    curCount++;
                }
            }
        }

        curLines.push(raw);
    }
    flush();

    // 2. 정렬 (LDraw 좌표계: Y가 아래쪽. 바닥부터 쌓으려면 Y 내림차순 정렬)
    let header = segments[0];
    let body = segments.slice(1);

    const headerHasGeometry = header.lines.some((line) => line.trim().startsWith("1 "));
    if (headerHasGeometry) {
        body = segments;
        header = { lines: [], avgY: -Infinity };
    }

    body.sort((a, b) => {
        if (a.avgY === -Infinity && b.avgY === -Infinity) return 0;
        if (a.avgY === -Infinity) return 1;
        if (b.avgY === -Infinity) return -1;
        return b.avgY - a.avgY;
    });

    // Merge steps by layer
    const LAYER_EPS = 8;
    const merged: { lines: string[]; avgY: number }[] = [];
    let curLinesMerge: string[] = [];
    let curY = Number.NEGATIVE_INFINITY;

    for (const seg of body) {
        if (curY === Number.NEGATIVE_INFINITY || Math.abs(seg.avgY - curY) < LAYER_EPS) {
            curLinesMerge = curLinesMerge.concat(seg.lines);
            if (curY === Number.NEGATIVE_INFINITY) curY = seg.avgY;
        } else {
            merged.push({ lines: curLinesMerge, avgY: curY });
            curLinesMerge = seg.lines;
            curY = seg.avgY;
        }
    }
    if (curLinesMerge.length) merged.push({ lines: curLinesMerge, avgY: curY });

    const sortedSegments = [header, ...merged];

    // 3. 누적 텍스트 생성
    const out: string[] = [];
    let acc: string[] = [];

    for (const seg of sortedSegments) {
        acc = acc.concat(seg.lines);
        out.push(acc.join("\n"));
    }

    // Bounds 생성
    let bounds: THREE.Box3 | null = null;
    if (minX !== Infinity) {
        bounds = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
        );
    }

    return { stepTexts: out, bounds };
}

export function buildCumulativeStepTexts(ldrText: string): string[] {
    const result = parseAndProcessSteps(ldrText);
    return result.stepTexts;
}
