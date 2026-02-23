import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { JudgeResult, JobListItem } from "@/types/judge";
import { JudgeLdrModel } from "./judge/JudgeLdrModel";
import { JobCard } from "./judge/JobCard";
import { ColorLegend } from "./judge/ColorLegend";

/* ── Main Component ── */
interface BrickJudgeViewerProps {
    initialSelectedId?: string;
}

export default function BrickJudgeViewer({ initialSelectedId }: BrickJudgeViewerProps) {
    const { authFetch } = useAuth();
    const { t } = useLanguage();
    const bj = t.admin.brickJudge;

    const [jobs, setJobs] = useState<JobListItem[]>([]);
    const [selectedJob, setSelectedJob] = useState<JobListItem | null>(null);
    const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [judging, setJudging] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [focusBrickId, setFocusBrickId] = useState<number | null>(null);

    // Job 리스트 로드
    useEffect(() => {
        fetchJobs();
    }, []);

    // [NEW] 외부에서 전달된 ID가 있으면 자동 선택
    useEffect(() => {
        if (initialSelectedId && jobs.length > 0) {
            const target = jobs.find(j => j.id === initialSelectedId);
            if (target) {
                handleSelectJob(target);
            }
        }
    }, [initialSelectedId, jobs]);

    // Job 선택 시 관련 결과 초기화 및 로드
    useEffect(() => {
        if (selectedJob) {
            setJudgeResult(null);
            analyzeJob(selectedJob);
        }
    }, [selectedJob]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/jobs?status=DONE&size=50");
            if (res.ok) {
                const data = await res.json();
                const content = (data.content || []) as JobListItem[];
                // ldrUrl이 있는 것만 필터
                setJobs(content.filter((j: JobListItem) => j.ldrUrl));
            }
        } catch (e) {
            console.error("[BrickJudge] Failed to fetch jobs:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectJob = (job: JobListItem) => {
        if (selectedJob?.id === job.id) return;
        setSelectedJob(job);
    };

    const analyzeJob = async (job: JobListItem) => {
        const targetUrl = job.ldrUrl;
        if (!targetUrl) return;

        setJudging(true);
        setModelError(null);

        try {
            const res = await authFetch("/api/admin/judge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ldrUrl: targetUrl }),
            });

            if (res.ok) {
                const data: JudgeResult = await res.json();
                setJudgeResult(data);
                setModelLoading(true);
            } else {
                console.error(`[BrickJudge] Judge failed:`, res.status);
            }
        } catch (e) {
            console.error(`[BrickJudge] Judge error:`, e);
            setModelError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setJudging(false);
        }
    };

    // 검색 필터 (프론트)
    const filteredJobs = useMemo(() => {
        if (!searchTerm.trim()) return jobs;
        const term = searchTerm.toLowerCase();
        return jobs.filter(
            (j) =>
                (j.userInfo?.nickname || "").toLowerCase().includes(term) ||
                (j.title || "").toLowerCase().includes(term)
        );
    }, [jobs, searchTerm]);

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    return (
        <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-4">
            {/* Left Panel: Job List */}
            <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">{bj.title}</h3>
                    <input
                        type="text"
                        placeholder={bj.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 mt-8">{bj.noJobs}</p>
                    ) : (
                        filteredJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                selected={selectedJob?.id === job.id}
                                onSelect={() => handleSelectJob(job)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: 3D Viewer + Results */}
            <div className="flex-1 flex flex-col gap-4">
                {/* 3D Viewer */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden relative flex flex-col">


                    {judging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-gray-500">{bj.analyzing}</p>
                            </div>
                        </div>
                    )}

                    {modelLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 pointer-events-none">
                            <div className="text-center">
                                <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-400">3D Loading...</p>
                            </div>
                        </div>
                    )}

                    {modelError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-20">
                            <div className="text-center text-red-600">
                                <p className="font-semibold mb-1">Load Error</p>
                                <p className="text-xs">{modelError}</p>
                            </div>
                        </div>
                    )}

                    {!judgeResult && !judging ? (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-gray-400 text-sm">{bj.selectJob}</p>
                        </div>
                    ) : judgeResult?.ldr_content ? (
                        <Canvas
                            key={selectedJob?.id}
                            camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }}
                            dpr={[1, 2]}
                            frameloop="demand"
                            className="flex-1"
                        >
                            <ThrottledDriver />
                            <color attach="background" args={["#f8f9fa"]} />
                            <ambientLight intensity={1.2} />
                            <directionalLight position={[10, 20, 10]} intensity={1.5} />
                            <directionalLight position={[-10, -20, -10]} intensity={0.8} />
                            <gridHelper args={[500, 50, 0x0f4c75, 0x0f3460]} />

                            <JudgeLdrModel
                                ldrContent={judgeResult.ldr_content}
                                brickColors={judgeResult.brick_colors || {}}
                                focusBrickId={focusBrickId}
                                onLoaded={() => setModelLoading(false)}
                                onError={(e) => {
                                    setModelLoading(false);
                                    setModelError(e?.message || "3D model load failed");
                                }}
                            />

                            <OrbitControls
                                makeDefault
                                enablePan
                                enableZoom
                                minDistance={1}
                                maxDistance={5000}
                            />
                        </Canvas>
                    ) : null}
                </div>

                {/* Summary & Detailed Issues */}
                {judgeResult && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shrink-0 overflow-y-auto max-h-[400px]">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-6 border-b pb-4">
                            <div className="text-center p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 shadow-sm">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">{bj.score}</p>
                                <p className={`text-xl font-black ${judgeResult.score >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                    {judgeResult.score}점
                                </p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{bj.brickCount}</p>
                                <p className="text-xl font-black text-gray-800">{judgeResult.brick_count}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{bj.issueCount}</p>
                                <p className="text-xl font-black text-gray-800">{judgeResult.issues.length}</p>
                            </div>
                            <div className="flex items-center justify-center p-2">
                                <a href={selectedJob?.ldrUrl} download className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-md active:scale-95 text-xs">
                                    ⬇️ DOWNLOAD LDR
                                </a>
                            </div>
                        </div>

                        {/* Current View Detailed Issues */}
                        <div className="mt-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 px-1">
                                Model Issues ({(judgeResult.issues ?? []).length})
                            </h4>

                            {(judgeResult.issues ?? []).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(judgeResult.issues ?? [])
                                        .sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9))
                                        .map((issue, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() =>
                                                    setFocusBrickId(
                                                        focusBrickId === issue.brick_id ? null : issue.brick_id
                                                    )
                                                }
                                                className={`text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border ${focusBrickId === issue.brick_id
                                                    ? "bg-gray-100 border-gray-400 shadow-sm"
                                                    : "bg-white border-gray-100 hover:border-gray-300"
                                                    }`}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-sm shrink-0"
                                                    style={{ backgroundColor: issue.color }}
                                                />
                                                <span className="flex-1 text-xs text-gray-700 truncate">{issue.message}</span>
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${issue.severity === "critical"
                                                        ? "bg-red-100 text-red-700"
                                                        : issue.severity === "high"
                                                            ? "bg-orange-100 text-orange-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                >
                                                    {issue.severity[0]}
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                    <p className="text-green-600 text-sm font-bold">✨ {bj.noIssues}</p>
                                </div>
                            )}

                            <ColorLegend t={bj} />
                            <div className="mt-4 text-[10px] text-gray-300 italic">
                                {bj.elapsed}: {(judgeResult.elapsed_ms ?? 0).toFixed(1)}ms
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
