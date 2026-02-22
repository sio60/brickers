import React from "react";
import Link from "next/link";

export type GalleryPost = {
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

interface GalleryListProps {
    posts: GalleryPost[];
    loading: boolean;
    t: any;
    onToggleVisibility: (post: GalleryPost) => void;
    onDelete: (postId: string) => void;
    onEditClick: (post: GalleryPost) => void;
}

export const GalleryList = ({
    posts,
    loading,
    t,
    onToggleVisibility,
    onDelete,
    onEditClick,
}: GalleryListProps) => {
    return (
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
                                                onClick={() => onToggleVisibility(post)}
                                                className="px-2 py-1 bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded text-xs"
                                            >
                                                {post.visibility === "PUBLIC" ? t.admin.gallery.action.hide : t.admin.gallery.action.unhide}
                                            </button>
                                            <button
                                                onClick={() => onDelete(post.id)}
                                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs"
                                            >
                                                {t.admin.gallery.action.delete}
                                            </button>
                                            <button
                                                onClick={() => onEditClick(post)}
                                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs"
                                            >
                                                Edit
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
        </div>
    );
};
