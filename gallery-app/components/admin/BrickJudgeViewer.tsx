"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import type { JudgeResult, JobListItem } from "@/types/judge";

const CDN_BASE =
    "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

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
function JudgeLdrModel({
    ldrContent,
    brickColors,
    focusBrickId,
}: {
    ldrContent: string;
    brickColors: Record<number, string>;
    focusBrickId: number | null;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const { invalidate, camera } = useThree();
    const [model, setModel] = useState<THREE.Group | null>(null);
    const meshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map());

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier((u) => {
            let fixed = u.replace(/\\/g, "/");
            fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
            fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

            const lowerFixed = fixed.toLowerCase();
            if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
                const filename = fixed.split("/").pop() || "";
                const lowerName = filename.toLowerCase();
                if (filename && lowerName !== filename) {
                    fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
                }

                const isPrimitive = /^\d+-\d+/.test(filename) ||
                    /^(stud|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|empty)/.test(filename);
                const isSubpart = /^\d+s\d+\.dat$/i.test(filename);

                fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
                fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
                fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
                fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

                if (isPrimitive && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
                    fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
                }
                if (isSubpart && fixed.includes("/ldraw/p/")) {
                    fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
                }
            }
            return fixed;
        });

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(CDN_BASE);
        (l as any).preloadMaterials(CDN_BASE + "LDConfig.ldr");
        return l;
    }, []);

    // LDR 텍스트 파싱 → 3D 모델
    useEffect(() => {
        if (!ldrContent) return;

        (loader as any).parse(ldrContent, "", (parsed: THREE.Group) => {
            removeNullChildren(parsed);

            // brick ID 할당 + mesh map 구축
            const meshMap = new Map<number, THREE.Mesh[]>();
            let brickId = 0;
            parsed.children.forEach((child) => {
                const meshes: THREE.Mesh[] = [];
                child.traverse((obj: any) => {
                    if (obj.isMesh) {
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

            // 좌표계 보정 (LDraw: -Y up)
            parsed.rotation.x = Math.PI;

            setModel((prev) => {
                if (prev) disposeObject3D(prev);
                return parsed;
            });
            invalidate();
        });

        return () => {
            setModel((prev) => {
                if (prev) disposeObject3D(prev);
                return null;
            });
        };
    }, [ldrContent, loader, invalidate]);

    // 히트맵 적용
    useEffect(() => {
        if (!model) return;
        const meshMap = meshMapRef.current;

        meshMap.forEach((meshes, id) => {
            const issueColor = brickColors[id];
            meshes.forEach((mesh) => {
                if (mesh.material) {
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

                    // 포커스 모드: 비대상 브릭 반투명
                    if (focusBrickId !== null && focusBrickId !== id) {
                        mat.transparent = true;
                        mat.opacity = 0.12;
                    } else {
                        mat.transparent = false;
                        mat.opacity = 1;
                    }

                    mesh.material = mat;
                }
            });
        });
        invalidate();
    }, [model, brickColors, focusBrickId, invalidate]);

    if (!model) return null;

    return (
        <Center>
            <group ref={groupRef}>
                <primitive object={model} />
            </group>
        </Center>
    );
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
            } else {
                console.error("[BrickJudge] Judge failed:", res.status);
            }
        } catch (e) {
            console.error("[BrickJudge] Judge error:", e);
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

                    {!judgeResult && !judging ? (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-gray-400 text-sm">{bj.selectJob}</p>
                        </div>
                    ) : judgeResult ? (
                        <Canvas
                            camera={{ position: [0, 80, 500], fov: 45 }}
                            dpr={[1, 2]}
                            gl={{ alpha: true }}
                            frameloop="demand"
                        >
                            <ambientLight intensity={1.2} />
                            <directionalLight position={[10, 20, 10]} intensity={1.5} />
                            <directionalLight position={[-10, -20, -10]} intensity={0.8} />

                            <JudgeLdrModel
                                ldrContent={judgeResult.ldr_content}
                                brickColors={judgeResult.brick_colors || {}}
                                focusBrickId={focusBrickId}
                            />

                            <OrbitControls
                                makeDefault
                                enablePan
                                enableZoom
                                minDistance={10}
                                maxDistance={1000}
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
                                    <span>{bj.issueCount}: <strong>{judgeResult.issues.length}</strong></span>
                                    <span className={judgeResult.stable ? "text-green-600" : "text-red-600"}>
                                        {judgeResult.stable ? bj.stable : bj.unstable}
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">
                                {bj.elapsed}: {judgeResult.elapsed_ms.toFixed(1)}ms
                            </span>
                        </div>

                        {judgeResult.issues.length > 0 ? (
                            <div className="space-y-1.5">
                                {judgeResult.issues
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
