import { useEffect, useState } from "react";
import { getGalleryItems } from "../../../api/myApi";
import { useLanguage } from "../../../contexts/LanguageContext";
import "./Gallery.css";
import Background3D from "../../MainPage/components/Background3D";
import { useNavigate } from "react-router-dom";

export default function Gallery() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "bookmarks">("all");

    useEffect(() => {
        setLoading(true);
        const fetchFn = tab === "all" ? getGalleryItems : () => import("../../../api/myApi").then(m => m.getMyBookmarks());

        fetchFn()
            .then((res: any) => {
                setItems(res.content || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch:", err);
                setLoading(false);
            });
    }, [tab]);

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
                                        <div key={item.id} className="galleryTable__row">
                                            <div className="galleryTable__col col-title">
                                                <span className="title-text">{item.title}</span>
                                            </div>
                                            <div className="galleryTable__col col-author">
                                                {item.authorNickname || "Anonymous"}
                                            </div>
                                            <div className="galleryTable__col col-date">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </div>
                                            <div className="galleryTable__col col-views">
                                                {item.viewCount || 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
