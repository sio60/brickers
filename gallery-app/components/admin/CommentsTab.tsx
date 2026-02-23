import React from "react";
import { useAdminComments } from "@/hooks/admin/useAdminComments";

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorNickname: string;
    content: string;
    deleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function CommentsTab() {
    const {
        comments,
        commentPage,
        setCommentPage,
        commentTotalPages,
        fetchComments,
        handleDeleteComment,
    } = useAdminComments();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Comments Management</h2>
                <button onClick={fetchComments} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <th className="px-6 py-4">Content</th>
                            <th className="px-6 py-4 w-40">Author</th>
                            <th className="px-6 py-4 w-32">Post ID</th>
                            <th className="px-6 py-4 w-40">Date</th>
                            <th className="px-6 py-4 w-24">Status</th>
                            <th className="px-6 py-4 w-24 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {comments.map((comment: Comment) => (
                            <tr key={comment.id} className="hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                <td className="px-6 py-4">
                                    <div className="max-w-md break-words">{comment.content}</div>
                                </td>
                                <td className="px-6 py-4 font-medium">{comment.authorNickname || 'Unknown'}</td>
                                <td className="px-6 py-4 text-xs text-gray-500 font-mono">{comment.postId.substring(0, 8)}...</td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleDateString()} <br />
                                    {new Date(comment.createdAt).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4">
                                    {comment.deleted ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Deleted
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!comment.deleted && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {comments.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    No comments found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {/* Pagination (Simple) */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                        disabled={commentPage === 0}
                        onClick={() => setCommentPage((p: number) => p - 1)}
                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500">Page {commentPage + 1} of {commentTotalPages || 1}</span>
                    <button
                        disabled={commentPage >= commentTotalPages - 1}
                        onClick={() => setCommentPage((p: number) => p + 1)}
                        className="px-3 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
