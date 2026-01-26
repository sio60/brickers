import { useEffect, useState } from "react";
import {
    getGalleryItems,
    getMyBookmarks,
    getGalleryDetail,
    toggleGalleryBookmark,
    toggleGalleryReaction,
} from "../../../api/myApi";
import type { GalleryItem, MyBookmarkItem, ReactionType } from "../../../api/myApi";
import { useLanguage } from "../../../contexts/LanguageContext";
import "./Gallery.css";
import Background3D from "../../MainPage/components/Background3D";
import { useNavigate } from "react-router-dom";

export default function Gallery() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [items, setItems] = useState<(GalleryItem | MyBookmarkItem)[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "bookmarks">("all");

    // 상세 모달 상태
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [myReaction, setMyReaction] = useState<ReactionType | null>(null);

    useEffect(() => {
        setLoading(true);
        const fetchFn = tab === "all" ? getGalleryItems : getMyBookmarks;

        fetchFn()
            .then((res) => {
                setItems(res.content || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch:", err);
                setLoading(false);
            });
    }, [tab]);

    // 행 클릭 시 상세 조회
    const handleRowClick = async (itemId: string) => {
        setDetailLoading(true);
        try {
            const detail = await getGalleryDetail(itemId);
            setSelectedItem(detail);
            setBookmarked(detail.bookmarked ?? false);
            setMyReaction(detail.myReaction ?? null);
        } catch (err) {
            console.error("Failed to load detail:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    // 북마크 토글 (Optimistic UI)
    const handleBookmarkToggle = async () => {
        if (!selectedItem) return;
        const prevBookmarked = bookmarked;
        setBookmarked(!bookmarked); // 즉시 반영
        try {
            const res = await toggleGalleryBookmark(selectedItem.id);
            setBookmarked(res.bookmarked); // 서버 응답으로 확정
        } catch (err) {
            console.error("Failed to toggle bookmark:", err);
            setBookmarked(prevBookmarked); // 실패 시 롤백
        }
    };

    // 좋아요/싫어요 토글 (Optimistic UI)
    const handleReactionToggle = async (type: ReactionType) => {
        if (!selectedItem) return;
        const prevReaction = myReaction;
        const prevItem = selectedItem;

        // 즉시 반영
        const newReaction = myReaction === type ? null : type;
        setMyReaction(newReaction);
        setSelectedItem(prev => prev ? {
            ...prev,
            likeCount: prev.likeCount + (type === 'LIKE' ? (newReaction === 'LIKE' ? 1 : (prevReaction === 'LIKE' ? -1 : 0)) : (prevReaction === 'LIKE' ? -1 : 0)),
            dislikeCount: prev.dislikeCount + (type === 'DISLIKE' ? (newReaction === 'DISLIKE' ? 1 : (prevReaction === 'DISLIKE' ? -1 : 0)) : (prevReaction === 'DISLIKE' ? -1 : 0))
        } : null);

        try {
            const res = await toggleGalleryReaction(selectedItem.id, type);
            setMyReaction(res.myReaction);
            setSelectedItem(prev => prev ? {
                ...prev,
                likeCount: res.likeCount,
                dislikeCount: res.dislikeCount
            } : null);
        } catch (err) {
            console.error("Failed to toggle reaction:", err);
            setMyReaction(prevReaction); // 실패 시 롤백
            setSelectedItem(prevItem);
        }
    };

    // 모달 닫기
    const closeModal = () => {
        setSelectedItem(null);
    };

    // 아이템 ID 추출 (GalleryItem은 id, MyBookmarkItem은 postId)
    const getItemId = (item: GalleryItem | MyBookmarkItem): string => {
        return 'id' in item ? item.id : item.postId;
    };

    // 아이템 제목 추출
    const getItemTitle = (item: GalleryItem | MyBookmarkItem): string => {
        return item.title;
    };

    // 아이템 작성자 추출 (MyBookmarkItem에는 없음)
    const getItemAuthor = (item: GalleryItem | MyBookmarkItem): string => {
        return 'authorNickname' in item ? (item.authorNickname || t.common.anonymous) : '-';
    };

    // 아이템 날짜 추출
    const getItemDate = (item: GalleryItem | MyBookmarkItem): string => {
        const dateStr = 'createdAt' in item ? item.createdAt : item.postCreatedAt;
        return new Date(dateStr).toLocaleString();
    };

    // 아이템 조회수 추출 (MyBookmarkItem에는 없음)
    const getItemViews = (item: GalleryItem | MyBookmarkItem): number => {
        return 'viewCount' in item ? item.viewCount : 0;
    };

    return (
        <div className="galleryPage">
            <Background3D entryDirection="float" />

            <div className="gallery__container">
                <div className="gallery__layout">
                    {/* 왼쪽 사이드바 카테고리 */}
                    <aside className="gallery__sidebar">
                        <button
                            className={`gallery__sidebarItem ${tab === "all" ? "active" : ""}`}
                            onClick={() => setTab("all")}
                        >
                            {t.floatingMenu.gallery}
                        </button>
                        <button
                            className={`gallery__sidebarItem ${tab === "bookmarks" ? "active" : ""}`}
                            onClick={() => setTab("bookmarks")}
                        >
                            {t.menu.bookmarks}
                        </button>
                    </aside>

                    {/* 오른쪽 메인 컨텐츠 영역 */}
                    <main className="gallery__content">
                        <header className="gallery__header">
                            <h1 className="gallery__title">
                                {tab === "all" ? t.floatingMenu.gallery : t.menu.bookmarks}
                            </h1>
                            <button className="gallery__closeBtn" onClick={() => navigate(-1)}>
                                ✕
                            </button>
                        </header>

                        {loading ? (
                            <div className="gallery__loading">{t.common.loading}</div>
                        ) : items.length === 0 ? (
                            <div className="gallery__empty">
                                <p>{t.kids.steps.emptyGallery}</p>
                            </div>
                        ) : (
                            <div className="galleryTable">
                                <div className="galleryTable__header">
                                    <div className="galleryTable__col col-title">{t.kids.steps.galleryTable.title}</div>
                                    <div className="galleryTable__col col-author">{t.kids.steps.galleryTable.author}</div>
                                    <div className="galleryTable__col col-date">{t.kids.steps.galleryTable.date}</div>
                                    <div className="galleryTable__col col-views">{t.kids.steps.galleryTable.views}</div>
                                </div>
                                <div className="galleryTable__body">
                                    {items.map(item => (
                                        <div
                                            key={getItemId(item)}
                                            className="galleryTable__row"
                                            onClick={() => handleRowClick(getItemId(item))}
                                        >
                                            <div className="galleryTable__col col-title">
                                                <span className="title-text">{getItemTitle(item)}</span>
                                            </div>
                                            <div className="galleryTable__col col-author">
                                                {getItemAuthor(item)}
                                            </div>
                                            <div className="galleryTable__col col-date">
                                                {getItemDate(item)}
                                            </div>
                                            <div className="galleryTable__col col-views">
                                                {getItemViews(item)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* 상세 모달 */}
            {(selectedItem || detailLoading) && (
                <div className="gallery__modalOverlay" onClick={closeModal}>
                    <div className="gallery__modal" onClick={e => e.stopPropagation()}>
                        {detailLoading ? (
                            <div className="gallery__modalLoading">{t.common.loading}</div>
                        ) : selectedItem && (
                            <>
                                <button className="gallery__modalClose" onClick={closeModal}>✕</button>

                                {selectedItem.thumbnailUrl && (
                                    <img
                                        src={selectedItem.thumbnailUrl}
                                        alt={selectedItem.title}
                                        className="gallery__modalImage"
                                    />
                                )}

                                <h2 className="gallery__modalTitle">{selectedItem.title}</h2>

                                <div className="gallery__modalMeta">
                                    <span className="gallery__modalAuthor">
                                        {selectedItem.authorNickname || t.common.anonymous}
                                    </span>
                                    <span className="gallery__modalDate">
                                        {new Date(selectedItem.createdAt).toLocaleString()}
                                    </span>
                                    <span className="gallery__modalViews">
                                        {t.kids.steps.galleryTable.views}: {selectedItem.viewCount}
                                    </span>
                                </div>

                                {selectedItem.content && (
                                    <p className="gallery__modalContent">{selectedItem.content}</p>
                                )}

                                {selectedItem.tags && selectedItem.tags.length > 0 && (
                                    <div className="gallery__modalTags">
                                        {selectedItem.tags.map((tag, idx) => (
                                            <span key={idx} className="gallery__modalTag">#{tag}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="gallery__modalActions">
                                    <button
                                        className={`gallery__actionBtn ${myReaction === 'LIKE' ? 'active' : ''}`}
                                        onClick={() => handleReactionToggle('LIKE')}
                                    >
                                        <span className="gallery__actionIcon">&#128077;</span>
                                        <span>{selectedItem.likeCount}</span>
                                    </button>
                                    <button
                                        className={`gallery__actionBtn ${myReaction === 'DISLIKE' ? 'active' : ''}`}
                                        onClick={() => handleReactionToggle('DISLIKE')}
                                    >
                                        <span className="gallery__actionIcon">&#128078;</span>
                                        <span>{selectedItem.dislikeCount}</span>
                                    </button>
                                    <button
                                        className={`gallery__actionBtn bookmark ${bookmarked ? 'active' : ''}`}
                                        onClick={handleBookmarkToggle}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 21" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle'}}>
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                        </svg>
                                        <span>{t.menu.bookmarks}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
