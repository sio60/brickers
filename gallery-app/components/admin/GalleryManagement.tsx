import { useEffect, useState, ChangeEvent, KeyboardEvent } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import EditGalleryModal from "@/components/gallery/EditGalleryModal";
import { updateGalleryPost } from "@/lib/api/galleryApi";
import { GalleryList, type GalleryPost } from "./gallery/GalleryList";
import { GalleryPagination } from "./gallery/GalleryPagination";

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

    // Edit Modal State
    const [editingPost, setEditingPost] = useState<GalleryPost | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("size", "20");

            if (keyword.trim()) params.append("keyword", keyword.trim());
            if (visibility !== "ALL") params.append("visibility", visibility);

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
    }, [page, visibility, status]);

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

    const handleEditClick = (post: GalleryPost) => {
        setEditingPost(post);
        setShowEditModal(true);
    };

    const handleEditSave = async (data: any) => {
        if (!editingPost) return;
        try {
            await updateGalleryPost(editingPost.id, data);
            setShowEditModal(false);
            setEditingPost(null);
            fetchPosts();
        } catch (e) {
            console.error(e);
            throw e;
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
                        className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none"
                    >
                        <option value="ALL">{t.admin.gallery.filter.all}</option>
                        <option value="PUBLIC">{t.admin.gallery.filter.public}</option>
                        <option value="PRIVATE">{t.admin.gallery.filter.private}</option>
                    </select>

                    <select
                        value={status}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => { setStatus(e.target.value); setPage(0); }}
                        className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none"
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
                        className="p-2 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:ring-1 focus:ring-black outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        Search
                    </button>
                </div>
            </div>

            <div className="space-y-0">
                <GalleryList
                    posts={posts}
                    loading={loading}
                    t={t}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                    onEditClick={handleEditClick}
                />

                <GalleryPagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {/* Edit Modal */}
            {showEditModal && editingPost && (
                <EditGalleryModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditSave}
                    initialData={{
                        title: editingPost.title,
                        content: "",
                        tags: [],
                        visibility: editingPost.visibility
                    }}
                />
            )}
        </div>
    );
}
