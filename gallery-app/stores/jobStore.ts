import { create } from 'zustand';

interface JobInfo {
    jobId: string;
    status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
    ldrUrl?: string;
    glbUrl?: string;
    age?: string;
    title?: string;
}

interface JobStore {
    // 현재 진행 중인 job
    activeJob: JobInfo | null;
    isPolling: boolean;
    showDoneToast: boolean;
    notifications: Notification[];

    // 내부 상태 (module-level 아닌 store 내부)
    _pollingTimeoutId: ReturnType<typeof setTimeout> | null;
    _pollingCount: number;

    // Actions
    setActiveJob: (job: JobInfo | null) => void;
    setShowDoneToast: (show: boolean) => void;
    startPolling: (jobId: string, age?: string) => void;
    stopPolling: () => void;
    clearJob: () => void;
    addNotification: (note: Notification) => void;
    markAsRead: (id: string) => void;
    clearNotifications: () => void;
}

export interface Notification {
    id: string; // jobId
    title: string;
    completedAt: string; // ISO string
    isRead: boolean;
}

const POLL_INTERVAL = 3000;
const MAX_POLLING_COUNT = 400;

export const useJobStore = create<JobStore>((set, get) => ({
    activeJob: null,
    isPolling: false,
    showDoneToast: false,
    notifications: [],
    _pollingTimeoutId: null,
    _pollingCount: 0,

    setActiveJob: (job) => set({ activeJob: job }),
    setShowDoneToast: (show) => set({ showDoneToast: show }),

    addNotification: (note) => set((state) => ({
        notifications: [note, ...state.notifications]
    })),

    markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        )
    })),

    clearNotifications: () => set({ notifications: [] }),

    startPolling: (jobId: string, age?: string) => {
        // 이미 폴링 중이면 중지
        const currentTimeout = get()._pollingTimeoutId;
        if (currentTimeout) {
            clearTimeout(currentTimeout);
        }

        set({
            activeJob: { jobId, status: 'QUEUED', age },
            isPolling: true,
            _pollingTimeoutId: null,
            _pollingCount: 0
        });

        const poll = async () => {
            const state = get();
            const count = state._pollingCount + 1;
            set({ _pollingCount: count });

            // 20분 초과 시 자동 중지
            if (count > MAX_POLLING_COUNT) {
                console.log('[JobStore] Timeout: 20분 초과, 폴링 중지');
                get().stopPolling();
                return;
            }

            // 폴링이 중지됐으면 리턴
            if (!state.isPolling) {
                return;
            }

            try {
                const res = await fetch(`/api/kids/jobs/${jobId}`, {
                    credentials: 'include',
                });

                // 에러 처리
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        console.warn('[JobStore] Auth error, stopping poll');
                        get().stopPolling();
                        set({
                            activeJob: {
                                ...get().activeJob!,
                                status: 'FAILED'
                            }
                        });
                        return;
                    }
                    scheduleNextPoll();
                    return;
                }

                const data = await res.json();
                const currentJob = get().activeJob;

                // job이 바뀌었으면 중지
                if (!currentJob || currentJob.jobId !== jobId) {
                    get().stopPolling();
                    return;
                }

                set({
                    activeJob: {
                        ...currentJob,
                        status: data.status,
                        ldrUrl: data.ldrUrl,
                        glbUrl: data.glbUrl,
                    }
                });

                if (data.status === 'DONE') {
                    // 완료 알림 추가
                    get().addNotification({
                        id: jobId,
                        title: currentJob.title || '새로운 브릭 생성 완료',
                        completedAt: new Date().toISOString(),
                        isRead: false
                    });

                    // 브라우저 알림 (기존)
                    const stepsUrl = `/kids/steps?url=${encodeURIComponent(data.ldrUrl || '')}&jobId=${jobId}&age=${age || ''}`;
                    if (typeof window !== 'undefined') {
                        import('@/lib/toast-utils').then(({ showToastNotification }) => {
                            showToastNotification(
                                'Generation Complete!',
                                'Brick model is ready. Click to check it out!',
                                '/logo.png',
                                stepsUrl
                            );
                        }).catch(console.error);
                    }

                    // 기존 토스트 표시 (옵션)
                    set({ showDoneToast: true });

                    get().stopPolling();
                } else if (data.status === 'FAILED') {
                    get().stopPolling();
                } else {
                    scheduleNextPoll();
                }
            } catch (e) {
                console.error('[JobStore] Polling error:', e);
                scheduleNextPoll();
            }
        };

        const scheduleNextPoll = () => {
            if (!get().isPolling) {
                return;
            }
            const timeoutId = setTimeout(poll, POLL_INTERVAL);
            set({ _pollingTimeoutId: timeoutId });
        };

        poll();
    },

    stopPolling: () => {
        const timeoutId = get()._pollingTimeoutId;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        set({
            isPolling: false,
            _pollingTimeoutId: null
        });
    },

    clearJob: () => {
        get().stopPolling();
        set({
            activeJob: null,
            isPolling: false,
            _pollingTimeoutId: null,
            _pollingCount: 0
        });
    },
}));
