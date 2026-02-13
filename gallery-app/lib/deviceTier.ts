export interface DeviceProfile {
  tier: 'low' | 'mid' | 'high';
  smoothNormals: boolean;
  dpr: [number, number];
  backgroundBrickCount: number;
  backgroundFps: number;
  thumbnailDelayMs: number;
}

let cached: DeviceProfile | null = null;

export function detectDeviceTier(): DeviceProfile {
  if (cached) return cached;

  let score = 0;

  // hardwareConcurrency (92% browser support)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;

  // deviceMemory (70% support, undefined on Safari/Firefox)
  const mem = (navigator as any).deviceMemory as number | undefined;
  if (mem !== undefined) {
    if (mem >= 8) score += 3;
    else if (mem >= 4) score += 2;
    else score += 1;
  } else {
    // Unknown memory — assume mid
    score += 2;
  }

  // Mobile UA penalty
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) score -= 1;

  let tier: DeviceProfile['tier'];
  if (score <= 3) tier = 'low';
  else if (score <= 5) tier = 'mid';
  else tier = 'high';

  const profiles: Record<DeviceProfile['tier'], DeviceProfile> = {
    low: {
      tier: 'low',
      smoothNormals: false,
      dpr: [1, 1],
      backgroundBrickCount: 0,
      backgroundFps: 10,
      thumbnailDelayMs: 5000,
    },
    mid: {
      tier: 'mid',
      smoothNormals: false,
      dpr: [1, 1.5],
      backgroundBrickCount: 20,
      backgroundFps: 15,
      thumbnailDelayMs: 3000,
    },
    high: {
      tier: 'high',
      smoothNormals: false,
      dpr: [1, 2],
      backgroundBrickCount: 40,
      backgroundFps: 24,
      thumbnailDelayMs: 1500,
    },
  };

  cached = profiles[tier];
  return cached;
}
