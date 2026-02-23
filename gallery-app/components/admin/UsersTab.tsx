import React, { ChangeEvent } from "react";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useLanguage } from "@/contexts/LanguageContext";

export interface User {
    id: string;
    email: string;
    nickname: string;
    profileImage?: string;
    role: string;
    membershipPlan: string;
    accountState: string;
    createdAt: string;
    lastLoginAt?: string;
    suspendedAt?: string;
    suspendedReason?: string;
}

export default function UsersTab() {
    const { t } = useLanguage();
    const {
        users,
        searchTerm,
        setSearchTerm,
        fetchUsers,
        handleUserSuspend,
        handleUserActivate,
        handleUserRoleChange,
    } = useAdminUsers();

    return (
        <div className="flex flex-col border-t-2 border-black">
            <div className="mb-5 flex gap-2.5">
                <input
                    type="text"
                    placeholder={t.admin.users?.searchPlaceholder || "Search by email or nickname..."}
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
                />
                <button onClick={fetchUsers} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#000", color: "#fff", cursor: "pointer" }}>
                    Search
                </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden" }}>
                <thead style={{ background: "#f5f5f5" }}>
                    <tr>
                        <th style={{ padding: "12px", textAlign: "left" }}>User info</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Membership</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Role</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.filter((u: User) =>
                        u.email?.includes(searchTerm) || u.nickname?.includes(searchTerm)
                    ).map((user: User) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "12px" }}>
                                <div style={{ fontWeight: "bold" }}>{user.nickname}</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
                                <div style={{ fontSize: "11px", color: "#999" }}>Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td style={{ padding: "12px" }}>
                                <span
                                    className="px-2 py-1 rounded text-xs font-extrabold uppercase"
                                    style={{ background: user.membershipPlan === "PRO" ? "#e6f7ff" : "#f5f5f5", color: user.membershipPlan === "PRO" ? "#1890ff" : "#666" }}>
                                    {user.membershipPlan}
                                </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                                <span
                                    className="px-2 py-1 rounded text-xs font-extrabold uppercase"
                                    style={{
                                        background: user.role === "ADMIN" ? "#f6ffed" : "#f0f5ff",
                                        color: user.role === "ADMIN" ? "#389e0d" : "#1d39c4",
                                    }}
                                >
                                    {user.role || "USER"}
                                </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                                <span
                                    className="px-2 py-1 rounded text-xs font-extrabold uppercase"
                                    style={{
                                        background: user.accountState === "ACTIVE" ? "#f6ffed" : user.accountState === "SUSPENDED" ? "#fff1f0" : "#fffbe6",
                                        color: user.accountState === "ACTIVE" ? "#52c41a" : user.accountState === "SUSPENDED" ? "#f5222d" : "#faad14",
                                    }}>
                                    {user.accountState}
                                    {user.suspendedReason && <div style={{ fontSize: "10px", marginTop: "2px" }}>({user.suspendedReason})</div>}
                                </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {user.accountState === "ACTIVE" ? (
                                        <button
                                            onClick={() => handleUserSuspend(user.id)}
                                            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ff4d4f", background: "#fff", color: "#ff4d4f", cursor: "pointer", fontSize: "12px" }}
                                        >
                                            Suspend
                                        </button>
                                    ) : user.accountState === "SUSPENDED" ? (
                                        <button
                                            onClick={() => handleUserActivate(user.id)}
                                            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #52c41a", background: "#fff", color: "#52c41a", cursor: "pointer", fontSize: "12px" }}
                                        >
                                            Activate
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => handleUserRoleChange(user.id, user.role === "ADMIN" ? "USER" : "ADMIN")}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "4px",
                                            border: "1px solid #1677ff",
                                            background: "#fff",
                                            color: "#1677ff",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        {user.role === "ADMIN" ? "Set USER" : "Set ADMIN"}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.length === 0 && <p className="text-center text-[#999] py-5 text-sm">{t.admin.users?.empty || "No users found."}</p>}
        </div>
    );
}
