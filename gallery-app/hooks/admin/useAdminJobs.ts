"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminJob } from "@/components/admin/JobsTab";

export function useAdminJobs() {
    const { authFetch } = useAuth();

    const [jobs, setJobs] = useState<AdminJob[]>([]);
    const [jobPage, setJobPage] = useState(0);
    const [jobTotalPages, setJobTotalPages] = useState(0);

    const [userSearch, setUserSearch] = useState("");
    const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [reportedOnly, setReportedOnly] = useState(false);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUserSearch(userSearch);
            setJobPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [userSearch]);

    const fetchJobs = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append("page", jobPage.toString());
            params.append("size", "50");
            if (debouncedUserSearch) params.append("userSearch", debouncedUserSearch);
            if (filterStatus) params.append("status", filterStatus);
            if (reportedOnly) params.append("reported", "true");

            const res = await authFetch(`/api/admin/jobs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data.content || []);
                setJobTotalPages(data.totalPages || 0);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch, jobPage, debouncedUserSearch, filterStatus, reportedOnly]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleJobAction = async (jobId: string, action: 'retry' | 'cancel') => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        try {
            const res = await authFetch(`/api/admin/jobs/${jobId}/${action}`, { method: "POST" });
            if (res.ok) {
                fetchJobs();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        jobs,
        jobPage,
        setJobPage,
        jobTotalPages,
        userSearch,
        setUserSearch,
        filterStatus,
        setFilterStatus,
        reportedOnly,
        setReportedOnly,
        fetchJobs,
        handleJobAction,
    };
}
