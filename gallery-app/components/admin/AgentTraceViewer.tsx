"use client";

import React, { useEffect, useState } from "react";

interface AgentTrace {
    id: string;
    jobId: string;
    step: string;
    nodeName: string;
    status: "START" | "SUCCESS" | "FAILURE" | "RETRY";
    input: any;
    output: any;
    durationMs: number;
    message?: string;
    createdAt: string;
}

interface AgentTraceViewerProps {
    jobId: string;
    onClose: () => void;
}

export default function AgentTraceViewer({ jobId, onClose }: AgentTraceViewerProps) {
    const [traces, setTraces] = useState<AgentTrace[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrace, setSelectedTrace] = useState<AgentTrace | null>(null);

    useEffect(() => {
        fetchTraces();
    }, [jobId]);

    const fetchTraces = async () => {
        try {
            // Assuming Next.js proxy or direct URL. Adjust as needed.
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/kids/jobs/${jobId}/traces`);
            if (res.ok) {
                const data = await res.json();
                setTraces(data);
                if (data.length > 0) setSelectedTrace(data[0]);
            } else {
                console.error("Failed to fetch traces");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case "SUCCESS": return "text-green-600 bg-green-100";
            case "FAILURE": return "text-red-600 bg-red-100";
            case "RETRY": return "text-orange-600 bg-orange-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold">Agent Trace History</h2>
                        <p className="text-sm text-gray-500">Job ID: {jobId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">
                        ✕ Close
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Timeline List */}
                    <div className="w-1/3 border-r overflow-y-auto bg-gray-50 p-2">
                        {loading ? (
                            <div className="p-4 text-center">Loading traces...</div>
                        ) : traces.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No trace data found.</div>
                        ) : (
                            <div className="space-y-2">
                                {traces.map((trace) => (
                                    <div
                                        key={trace.id}
                                        onClick={() => setSelectedTrace(trace)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedTrace?.id === trace.id
                                            ? "bg-blue-50 border-blue-300 shadow-sm"
                                            : "bg-white border-gray-200 hover:border-blue-200"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-sm">{trace.nodeName}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(trace.status)}`}>
                                                {trace.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>{trace.step}</span>
                                            <span>{trace.durationMs}ms</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {new Date(trace.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + new Date(trace.createdAt).getMilliseconds().toString().padStart(3, '0')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Details */}
                    <div className="w-2/3 p-4 overflow-y-auto bg-white">
                        {selectedTrace ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Input State</h3>
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                        {JSON.stringify(selectedTrace.input, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Output State / Result</h3>
                                    <pre className={`p-4 rounded-lg text-xs overflow-x-auto ${selectedTrace.status === 'FAILURE' ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {JSON.stringify(selectedTrace.output, null, 2)}
                                    </pre>
                                </div>

                                {selectedTrace.message && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Log Message</h3>
                                        <div className="p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">
                                            {selectedTrace.message}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Select a step to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
