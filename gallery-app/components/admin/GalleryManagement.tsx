"use client";

import { useEffect, useState, ChangeEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
// We'll use Tailwind classes for layout to keep it simple and consistent with new components

type GalleryPost = {
    id: string;
    title: string;
    authorId: string;
    authorNickname: string;
    thumbnailUrl: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    visibility: "PUBLIC" | "PRIVATE";
    deleted: boolean;
    createdAt: string;
};

export default function GalleryManagement() {
    const { t } = useLanguage();
    const { authFetch } = useAuth();

    const [posts, setPosts] = useState<GalleryPost[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [keyword, setKeyword] = useState("");
    const [visibility, setVisibility] = useState<string>("ALL"); // ALL, PUBLIC, PRIVATE
    const [status, setStatus] = useState<string>("ALL"); // ALL, ACTIVE, DELETED

    // Pagination
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("size", "20");

            if (keyword.trim()) params.append("keyword", keyword.trim());

            if (visibility !== "ALL") params.append("visibility", visibility);

            // Status: ALL -> deleted=null (backend defaults to false usually, but we need to check service)
            // My service logic: if deleted is null -> searchAdminNoVisibility (or findByDeleted)
            // Wait, my service: `boolean isDeleted = deleted != null && deleted;` 
            // So if I pass nothing, it defaults to false (Active only).
            // If I want "Deleted Only", pass `deleted=true`.
            // If I want "ALL", I need to update backend to support "ignore deleted flag".
            // Currently backend `searchAdmin` takes `boolean deleted`. It relies on exact match.
            // So I can only filter "Active" or "Deleted". I cannot show BOTH easily with current backend.
            // *Self-correction*: I should have checked this. 
            // For now, let's implement "Active" (default) and "Deleted" (trash bin). 
            // "ALL" might not be supported yet. 
            // I will implement Toggle: "Show Deleted" checkbox or Status Select: Active / Deleted.
            if (status === "DELETED") params.append("deleted", "true");
            else params.append("deleted", "false"); // Default to active

            const res = await authFetch(`/api/admin/gallery?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.content || []);
                setTotalPages(data.totalPages || 0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [page, visibility, status]); // creating new closure, but fetchPosts uses current state? 
    // No, fetchPosts closes over state. I need to include dependencies or use ref/arguments.
    // Better to use `useEffect` to trigger fetch when filters change.
    // But `fetchPosts` depends on `keyword` which is input. We don't want to fetch on every keystroke.
    // We want search button.

    // Let's separate "Search Trigger"
    const handleSearch = () => {
        setPage(0);
        fetchPosts();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    // Actions
    const handleToggleVisibility = async (post: GalleryPost) => {
        const action = post.visibility === "PUBLIC" ? "hide" : "unhide";
        const confirmMsg = action === "hide" ? t.admin.gallery.confirm.hide : t.admin.gallery.confirm.unhide;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await authFetch(`/api/admin/gallery/${post.id}/${action}`, { method: "POST" });
            if (res.ok) {
                fetchPosts(); // Refresh
            }
        } catch (e) {
            alert("Error");
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm(t.admin.gallery.confirm.delete)) return;
        try {
            const res = await authFetch(`/api/admin/gallery/${postId}`, { method: "DELETE" });
            if (res.ok) {
                fetchPosts();
            }
        } catch (e) {
            alert("Error");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={visibility}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => { setVisibility(e.target.value); setPage(0); }}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="ALL">{t.admin.gallery.filter.all}</option>
                        <option value="PUBLIC">{t.admin.gallery.filter.public}</option>
                        <option value="PRIVATE">{t.admin.gallery.filter.private}</option>
                    </select>

                    <select
                        value={status}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => { setStatus(e.target.value); setPage(0); }}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="ACTIVE">{t.admin.gallery.filter.active}</option>
                        <option value="DELETED">{t.admin.gallery.filter.deleted}</option>
                    </select>
                </div>

                <div className="flex gap-2 w-full md:w-auto flex-1 justify-end">
                    <input
                        type="text"
                        placeholder={t.admin.gallery.searchPlaceholder}
                        value={keyword}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="p-2 border border-gray-300 rounded-lg text-sm w-full md:w-64"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <th className="px-6 py-4 w-20">{t.admin.gallery.table.thumbnail}</th>
                            <th className="px-6 py-4">{t.admin.gallery.table.info}</th>
                            <th className="px-6 py-4 text-center">{t.admin.gallery.table.stats}</th>
                            <th className="px-6 py-4 text-center">{t.admin.gallery.table.status}</th>
                            <th className="px-6 py-4 w-32">{t.admin.gallery.table.date}</th>
                            <th className="px-6 py-4 text-right">{t.admin.gallery.table.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {posts.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                <td className="px-6 py-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                                        {post.thumbnailUrl ? (
                                            <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Img</div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{post.title}</div>
                                    <div className="text-xs text-gray-500">{post.authorNickname}</div>
                                </td>
                                <td className="px-6 py-4 text-center text-xs text-gray-500">
                                    <div>Views: {post.viewCount}</div>
                                    <div>Likes: {post.likeCount}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                        ${post.deleted ? 'bg-red-100 text-red-800' :
                                            post.visibility === 'PRIVATE' ? 'bg-gray-100 text-gray-800' :
                                                'bg-green-100 text-green-800'}`}>
                                        {post.deleted ? t.admin.gallery.filter.deleted :
                                            post.visibility === 'PRIVATE' ? t.admin.gallery.filter.private :
                                                t.admin.gallery.filter.public}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link
                                            href={`/gallery/${post.id}`}
                                            target="_blank"
                                            className="px-2 py-1 bg-gray-100/50 hover:bg-gray-100 text-blue-600 rounded text-xs"
                                        >
                                            {t.admin.gallery.action.view}
                                        </Link>

                                        {!post.deleted && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleVisibility(post)}
                                                    className="px-2 py-1 bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded text-xs"
                                                >
                                                    {post.visibility === "PUBLIC" ? t.admin.gallery.action.hide : t.admin.gallery.action.unhide}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs"
                                                >
                                                    {t.admin.gallery.action.delete}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {posts.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    No posts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500">Page {page + 1} of {totalPages || 1}</span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
