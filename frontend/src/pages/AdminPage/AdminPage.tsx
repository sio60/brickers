import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { getMyProfile, getAdminStats } from "../../api/myApi";
import type { AdminStats } from "../../api/myApi";
import "./AdminPage.css";
import Background3D from "../MainPage/components/Background3D";

export default function AdminPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);

    useEffect(() => {
        getMyProfile()
            .then(profile => {
                console.log("AdminPage access check - User profile:", profile);
                if (profile.role === "ADMIN") {
                    console.log("Access granted: ADMIN role confirmed. Fetching stats...");
                    return getAdminStats();
                } else {
                    console.warn("Access denied: Role is " + profile.role + ". Redirecting...");
                    alert(t.admin.accessDenied.replace("{role}", profile.role));
                    navigate("/", { replace: true });
                }
            })
            .then(s => {
                if (s) {
                    setStats(s);
                    setLoading(false);
                }
            })
            .catch(() => {
                navigate("/", { replace: true });
            });
    }, []);

    if (loading) return null;

    return (
        <div className="adminPage">
            <Background3D entryDirection="float" />
            <div className="admin__container">
                <div className="admin__layout">
                    <aside className="admin__sidebar">
                        <div className="admin__sidebarTitle">{t.admin.panelTitle}</div>
                        <button className="admin__sidebarItem active">{t.admin.sidebar.dashboard}</button>
                        <button className="admin__sidebarItem">{t.admin.sidebar.users}</button>
                        <button className="admin__sidebarItem">{t.admin.sidebar.gallery}</button>
                        <button className="admin__sidebarItem">{t.admin.sidebar.settings}</button>
                    </aside>

                    <main className="admin__content">
                        <header className="admin__header">
                            <h1 className="admin__title">{t.floatingMenu.admin}</h1>
                            <button className="admin__closeBtn" onClick={() => navigate(-1)}>✕</button>
                        </header>

                        <div className="admin__dashboard">
                            <p>{t.admin.welcome}</p>
                            <div className="admin__statsGrid">
                                <div className="admin__statCard">
                                    <h3>{t.admin.stats.users}</h3>
                                    <p className="admin__statValue">{stats?.totalUsers ?? "--"}</p>
                                </div>
                                <div className="admin__statCard">
                                    <h3>{t.admin.stats.jobs}</h3>
                                    <p className="admin__statValue">{stats?.totalJobsCount ?? "--"}</p>
                                </div>
                                <div className="admin__statCard">
                                    <h3>{t.admin.stats.gallery}</h3>
                                    <p className="admin__statValue">{stats?.totalGalleryPosts ?? "--"}</p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
