'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMyOverview, MyOverview } from "@/lib/api/myApi";
import styles from "./MyPage.module.css";

export default function MyPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading, user } = useAuth();
    const { t } = useLanguage();

    const [overview, setOverview] = useState<MyOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/?login=true");
            return;
        }

        if (isAuthenticated) {
            getMyOverview()
                .then(setOverview)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>{t.common.loading}</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>{t.menu.profile}</h1>

                {overview && (
                    <div className={styles.profileCard}>
                        <div className={styles.avatar}>
                            {overview.settings.profileImage ? (
                                <img src={overview.settings.profileImage} alt="Profile" />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {overview.settings.nickname?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>
                        <div className={styles.profileInfo}>
                            <h2>{overview.settings.nickname || t.profile.defaultNickname}</h2>
                            <p>{overview.settings.email}</p>
                            <p className={styles.plan}>{overview.settings.membershipPlan}</p>
                        </div>
                    </div>
                )}

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{overview?.jobs.totalCount || 0}</span>
                        <span className={styles.statLabel}>{t.mypage.stats.jobs}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{overview?.gallery.totalCount || 0}</span>
                        <span className={styles.statLabel}>{t.mypage.stats.gallery}</span>
                    </div>
                </div>

                <div className={styles.sections}>
                    <div className={styles.section}>
                        <h3>{t.jobs.title}</h3>
                        {overview?.jobs.recent && overview.jobs.recent.length > 0 ? (
                            <div className={styles.jobList}>
                                {overview.jobs.recent.slice(0, 3).map((job) => (
                                    <div key={job.id} className={styles.jobItem}>
                                        <span>{job.title || 'Untitled'}</span>
                                        <span className={styles.jobStatus}>{t.jobs.status[job.status]}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.empty}>{t.jobs.empty}</p>
                        )}
                    </div>

                    <div className={styles.section}>
                        <h3>{t.menu.gallery}</h3>
                        {overview?.gallery.recent && overview.gallery.recent.length > 0 ? (
                            <div className={styles.galleryGrid}>
                                {overview.gallery.recent.slice(0, 4).map((item) => (
                                    <div key={item.id} className={styles.galleryItem}>
                                        <img src={item.thumbnailUrl} alt={item.title} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.empty}>{t.my.empty}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
