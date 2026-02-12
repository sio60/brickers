"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import type { JudgeResult, JobListItem } from "@/types/judge";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";

/* Monkey-patch: null children 방지 */
const _origAdd = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...objects: THREE.Object3D[]) {
    return _origAdd.apply(this, objects.filter(o => o != null));
};

function removeNullChildren(obj: THREE.Object3D) {
    if (!obj) return;
    if (obj.children) {
        obj.children = obj.children.filter(c => c !== null && c !== undefined);
        obj.children.forEach(c => removeNullChildren(c));
    }
}

function disposeObject3D(root: THREE.Object3D) {
    if (!root) return;
    removeNullChildren(root);
    root.traverse((obj: any) => {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m: any) => m?.dispose?.());
        else mat?.dispose?.();
    });
}

const ISSUE_COLORS: Record<string, string> = {
    top_only: "#0055FF",
    floating: "#FF0000",
    isolated: "#FFCC00",
    unstable_base: "#FF6600",
};

const NORMAL_COLOR = "#4CAF50";

/* ── 3D LDR Model with Heatmap ── */
/* KidsLdrPreview 와 동일한 검증된 패턴 사용:
   1. Blob URL + loadAsync() (parse() 대신)
   2. preloadMaterials() await 후 로딩
   3. /api/proxy/ldr 프록시 사용 (fallback 지원)
   4. URL modifier 완전 일치
   5. async/await + cancellation 패턴 */
function JudgeLdrModel({
    ldrContent,
    brickColors,
    focusBrickId,
    onLoaded,
    onError,
}: {
    ldrContent: string;
    brickColors: Record<number, string>;
    focusBrickId: number | null;
    onLoaded?: () => void;
    onError?: (err: any) => void;
}) {
    const { invalidate, camera, controls } = useThree();
    const [model, setModel] = useState<THREE.Group | null>(null);
    const meshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map());

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier());
        manager.onError = (path) => console.warn("[LDraw] failed to load:", path);

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(CDN_BASE);
        l.smoothNormals = true;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }

        return l;
    }, []);

    useEffect(() => {
        if (!ldrContent) return;
        let cancelled = false;
        let prev: THREE.Group | null = null;

        (async () => {
            try {
                setModel(null);

                await loader.preloadMaterials(CDN_BASE + "LDConfig.ldr");

                const blob = new Blob([ldrContent], { type: "text/plain" });
                const blobUrl = URL.createObjectURL(blob);

                const parsed = await loader.loadAsync(blobUrl);
                URL.revokeObjectURL(blobUrl);

                if (cancelled) { disposeObject3D(parsed); return; }
                if (!parsed) return;

                removeNullChildren(parsed);

                const meshMap = new Map<number, THREE.Mesh[]>();
                let brickId = 0;
                (parsed.children ?? []).forEach((child) => {
                    if (!child) return;
                    const meshes: THREE.Mesh[] = [];
                    child.traverse((obj: any) => {
                        if (obj?.isMesh) {
                            obj.userData.brickId = brickId;
                            meshes.push(obj);
                        }
                    });
                    if (meshes.length > 0) {
                        meshMap.set(brickId, meshes);
                        brickId++;
                    }
                });
                meshMapRef.current = meshMap;

                parsed.rotation.x = Math.PI;

                // 바닥 중심 정렬: bounding box 계산 후 모델 이동
                const box = new THREE.Box3().setFromObject(parsed);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                // X/Z 중심, Y는 바닥(min)을 0으로
                parsed.position.set(-center.x, -box.min.y, -center.z);

                // OrbitControls target을 모델 중심 높이로 설정
                const targetY = size.y / 2;
                if (controls && (controls as any).target) {
                    (controls as any).target.set(0, targetY, 0);
                    (controls as any).update();
                }
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(0, targetY + size.y * 0.3, maxDim * 2.5);
                camera.lookAt(0, targetY, 0);

                prev = parsed;
                setModel(parsed);
                invalidate();
                onLoaded?.();
            } catch (e) {
                console.error("[BrickJudge] load error:", e);
                onError?.(e);
            }
        })();

        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
        };
    }, [ldrContent, loader, onLoaded, onError, camera, controls, invalidate]);

    // 히트맵 적용
    useEffect(() => {
        if (!model) return;
        const meshMap = meshMapRef.current;

        meshMap.forEach((meshes, id) => {
            const issueColor = brickColors[id];
            meshes.forEach((mesh) => {
                if (!mesh.material) return;
                const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
                if (issueColor) {
                    mat.color = new THREE.Color(issueColor);
                    mat.emissive = new THREE.Color(issueColor);
                    mat.emissiveIntensity = 0.4;
                } else {
                    mat.color = new THREE.Color(NORMAL_COLOR);
                    mat.emissive = new THREE.Color(NORMAL_COLOR);
                    mat.emissiveIntensity = 0.15;
                }

                if (focusBrickId !== null && focusBrickId !== id) {
                    mat.transparent = true;
                    mat.opacity = 0.12;
                } else {
                    mat.transparent = false;
                    mat.opacity = 1;
                }

                mesh.material = mat;
            });
        });
        invalidate();
    }, [model, brickColors, focusBrickId, invalidate]);

    if (!model) return null;

    return <primitive object={model} />;
}

/* ── Job Card ── */
function JobCard({
    job,
    selected,
    onSelect,
}: {
    job: JobListItem;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 rounded-lg border transition-all ${selected
                ? "border-black bg-gray-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
        >
            <div className="flex items-center gap-3">
                {(job.previewImageUrl || job.sourceImageUrl) ? (
                    <img
                        src={job.previewImageUrl || job.sourceImageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                        LDR
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        {job.userInfo?.profileImage ? (
                            <img src={job.userInfo.profileImage} alt="" className="w-4 h-4 rounded-full" />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                        )}
                        <span className="text-xs text-gray-500 truncate">{job.userInfo?.nickname || "Unknown"}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.title || "Untitled"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </button>
    );
}

/* ── Score Badge ── */
function ScoreBadge({ score, stable }: { score: number; stable: boolean }) {
    const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
    const bg = score >= 80 ? "bg-green-50" : score >= 50 ? "bg-yellow-50" : "bg-red-50";
    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}>
            <span className={`text-2xl font-bold ${color}`}>{score}</span>
            <span className="text-xs text-gray-500">/ 100</span>
        </div>
    );
}

/* ── Legend ── */
function ColorLegend({ t }: { t: any }) {
    const items = [
        { color: ISSUE_COLORS.floating, label: t.legend.floating },
        { color: ISSUE_COLORS.isolated, label: t.legend.isolated },
        { color: ISSUE_COLORS.top_only, label: t.legend.topOnly },
        { color: NORMAL_COLOR, label: t.legend.normal },
    ];
    return (
        <div className="flex flex-wrap gap-3 mt-3">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

/* ── Main Component ── */
export default function BrickJudgeViewer() {
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

    const handleAnalyze = async (job: JobListItem) => {
        setSelectedJob(job);
        setJudgeResult(null);
        setFocusBrickId(null);
        setModelError(null);
        setModelLoading(false);
        setJudging(true);

        try {
            const res = await authFetch("/api/admin/judge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ldrUrl: job.ldrUrl }),
            });

            if (res.ok) {
                const data: JudgeResult = await res.json();
                setJudgeResult(data);
                setModelLoading(true);
            } else {
                console.error("[BrickJudge] Judge failed:", res.status);
                setModelError(`Judge API failed: ${res.status}`);
            }
        } catch (e) {
            console.error("[BrickJudge] Judge error:", e);
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
                                onSelect={() => handleAnalyze(job)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: 3D Viewer + Results */}
            <div className="flex-1 flex flex-col gap-4">
                {/* 3D Viewer */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden relative">
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
                            key={selectedJob?.id || "empty"}
                            camera={{ position: [0, 200, 600], fov: 45, near: 0.1, far: 100000 }}
                            dpr={[1, 2]}
                            frameloop="demand"
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

                {/* Results Panel */}
                {judgeResult && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shrink-0 max-h-64 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <ScoreBadge score={judgeResult.score} stable={judgeResult.stable} />
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span>{bj.brickCount}: <strong>{judgeResult.brick_count}</strong></span>
                                    <span>{bj.issueCount}: <strong>{(judgeResult.issues ?? []).length}</strong></span>
                                    <span className={judgeResult.stable ? "text-green-600" : "text-red-600"}>
                                        {judgeResult.stable ? bj.stable : bj.unstable}
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">
                                {bj.elapsed}: {(judgeResult.elapsed_ms ?? 0).toFixed(1)}ms
                            </span>
                        </div>

                        {(judgeResult.issues ?? []).length > 0 ? (
                            <div className="space-y-1.5">
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
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${focusBrickId === issue.brick_id
                                                ? "bg-gray-100 ring-1 ring-gray-300"
                                                : "hover:bg-gray-50"
                                                }`}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-sm shrink-0"
                                                style={{ backgroundColor: issue.color }}
                                            />
                                            <span className="flex-1 text-gray-700">{issue.message}</span>
                                            <span
                                                className={`text-xs px-1.5 py-0.5 rounded ${issue.severity === "critical"
                                                    ? "bg-red-100 text-red-700"
                                                    : issue.severity === "high"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                            >
                                                {issue.severity}
                                            </span>
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-green-600 text-sm">{bj.noIssues}</p>
                        )}

                        <ColorLegend t={bj} />
                    </div>
                )}
            </div>
        </div>
    );
}
