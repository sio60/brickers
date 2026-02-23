"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/components/admin/UsersTab";

export function useAdminUsers() {
    const { authFetch } = useAuth();
    const { t } = useLanguage();

    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/users?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.content || []);
            }
        } catch (e) {
            console.error(e);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserSuspend = async (userId: string) => {
        const reason = prompt(t.admin.users?.suspendReason || "Enter reason for suspension:");
        if (reason === null) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/suspend`, {
                method: "POST",
                body: JSON.stringify({ reason: reason || "Admin suspended" })
            });
            if (res.ok) {
                alert(t.admin.users?.suspended || "User suspended.");
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUserActivate = async (userId: string) => {
        if (!confirm(t.admin.users?.confirmActivate || "Activate this user?")) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/activate`, { method: "POST" });
            if (res.ok) {
                alert(t.admin.users?.activated || "User activated.");
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUserRoleChange = async (userId: string, nextRole: "USER" | "ADMIN") => {
        if (!confirm(`Change user role to ${nextRole}?`)) return;
        try {
            const res = await authFetch(`/api/admin/users/${userId}/role`, {
                method: "POST",
                body: JSON.stringify({ role: nextRole })
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return {
        users,
        searchTerm,
        setSearchTerm,
        fetchUsers,
        handleUserSuspend,
        handleUserActivate,
        handleUserRoleChange,
    };
}
