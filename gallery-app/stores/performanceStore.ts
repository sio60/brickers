import { create } from 'zustand';
import { detectDeviceTier, type DeviceProfile } from '@/lib/deviceTier';

type LoadingPhase = 'idle' | 'loading-3d' | 'loaded';

interface PerformanceStore {
  profile: DeviceProfile | null;
  loadingPhase: LoadingPhase;
  isBackgroundPaused: boolean;
  fps: number;
  fpsHistory: number[];
  _lowFpsStart: number | null;

  init: () => void;
  setLoadingPhase: (phase: LoadingPhase) => void;
  reportFps: (fps: number) => void;
}

export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  profile: null,
  loadingPhase: 'idle',
  isBackgroundPaused: false,
  fps: 60,
  fpsHistory: [],
  _lowFpsStart: null,

  init: () => {
    if (get().profile) return;
    const profile = detectDeviceTier();
    set({ profile });
  },

  setLoadingPhase: (phase) => {
    const paused = phase === 'loading-3d';
    set({ loadingPhase: phase, isBackgroundPaused: paused });
    // Reset low FPS tracking when phase changes
    if (!paused) {
      set({ _lowFpsStart: null });
    }
  },

  reportFps: (currentFps) => {
    const state = get();
    const history = [...state.fpsHistory.slice(-9), currentFps];
    const avg = history.reduce((a, b) => a + b, 0) / history.length;

    let lowStart = state._lowFpsStart;
    let paused = state.isBackgroundPaused;

    if (avg < 15 && state.loadingPhase === 'loaded') {
      if (!lowStart) {
        lowStart = Date.now();
      } else if (Date.now() - lowStart > 5000) {
        // 5 seconds of sub-15 FPS → pause background
        paused = true;
      }
    } else {
      lowStart = null;
    }

    set({
      fps: Math.round(avg),
      fpsHistory: history,
      _lowFpsStart: lowStart,
      isBackgroundPaused: paused,
    });
  },
}));
