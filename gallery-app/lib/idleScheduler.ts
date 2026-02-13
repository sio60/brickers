type IdleHandle = number;

export function scheduleIdleWork(
  callback: () => void,
  options?: { timeout?: number }
): IdleHandle {
  if (typeof window === 'undefined') {
    return 0; // SSR no-op
  }
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(
      () => callback(),
      options?.timeout ? { timeout: options.timeout } : undefined
    );
  }
  // Fallback: setTimeout with 50ms delay (yields to main thread)
  return setTimeout(callback, 50) as unknown as IdleHandle;
}

export function cancelIdleWork(id: IdleHandle): void {
  if (typeof window === 'undefined') return;
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
