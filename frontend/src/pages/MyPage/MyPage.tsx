import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyPage.css";
import { getMyOverview, getMyProfile, retryJob, updateMyProfile, ApiError } from "../../api/myApi";
import type { MyOverview, MyProfile, MyJob } from "../../api/myApi";
import Background3D from "../MainPage/components/Background3D";
import FloatingMenuButton from "../KidsPage/components/FloatingMenuButton";
import UpgradeModal from "../MainPage/components/UpgradeModal";
import KidsLdrPreview from "../KidsPage/components/KidsLdrPreview";
import { useLanguage } from "../../contexts/LanguageContext";

type MenuItem = "profile" | "membership" | "jobs" | "settings" | "delete";

export default function MyPage() {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    // 프로필 수정 관련 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [editBio, setEditBio] = useState("");
    const [saving, setSaving] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

    // 3D 뷰어 모달 상태
    const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        Promise.all([getMyOverview(), getMyProfile()])
            .then(([overviewRes, profileRes]) => {
                setData(overviewRes);
                setProfile(profileRes);
                setLoading(false);
            })
            .catch((err) => {
                if (err instanceof ApiError) {
                    setError({ message: err.message, status: err.status });
                } else {
                    setError({ message: err instanceof Error ? err.message : t.common.unknownError, status: 0 });
                }
                setLoading(false);
            });
    }, [language]); // 언어 변경 시 에러 메시지 갱신을 위해 dependency 추가

    // 수정 모드 진입 시 현재 값으로 초기화
    const startEditing = () => {
        if (profile) {
            setEditNickname(profile.nickname || "");
            setEditBio(profile.bio || "");
        }
        setIsEditing(true);
    };

    // 수정 취소
    const cancelEditing = () => {
        setIsEditing(false);
    };

    // 프로필 저장 (닉네임, 자기소개만)
    const saveProfile = async () => {
        try {
            setSaving(true);
            const updated = await updateMyProfile({
                nickname: editNickname,
                bio: editBio,
            });
            setProfile(updated);
            setIsEditing(false);
            alert(t.profile.alertSaved);
        } catch {
            alert(t.profile.alertFailed);
        } finally {
            setSaving(false);
        }
    };

    const handleRetry = async (jobId: string) => {
        try {
            setRetrying(jobId);
            await retryJob(jobId);
            const updated = await getMyOverview();
            setData(updated);
        } catch {
            alert(t.jobs.retryFail);
        } finally {
            setRetrying(null);
        }
    };

    const getStatusLabel = (status: MyJob["status"] | string) => {
        const statusMap: Record<string, string> = t.jobs.status;
        return statusMap[status] || status;
    };

    const getStatusClass = (status: MyJob["status"] | string) => {
        switch (status) {
            case "QUEUED": return "pending";
            case "RUNNING": return "running";
            case "CANCELED": return "paused"; // or canceled
            case "DONE": return "completed";
            case "FAILED": return "failed";
            default: return "";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const menuItems = [
        { id: "profile" as MenuItem, label: t.menu.profile },
        { id: "membership" as MenuItem, label: t.menu.membership },
        { id: "jobs" as MenuItem, label: t.menu.jobs },
        { id: "settings" as MenuItem, label: t.menu.settings },
        { id: "delete" as MenuItem, label: t.menu.delete },
    ];

    // 실시간 업데이트 (Polling)
    useEffect(() => {
        let intervalId: any;

        if (activeMenu === "jobs") {
            const fetchJobs = async () => {
                try {
                    // 전체 오버뷰 대신 job만 가져오는게 효율적이지만, 현재 API 구조상 overview 활용
                    const updated = await getMyOverview();
                    setData(updated);
                } catch (e) {
                    console.error("Polling failed", e);
                }
            };

            // 3초마다 갱신
            intervalId = setInterval(fetchJobs, 3000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeMenu]);

    const renderContent = () => {
        if (loading) {
            return <div className="mypage__loading">{t.common.loading}</div>;
        }

        if (error) {
            if (error.status === 401) {
                return (
                    <div className="mypage__error">
                        <p>{t.common.loginRequired}</p>
                        <button className="mypage__loginBtn" onClick={() => navigate("/")}>
                            {t.common.homeBtn}
                        </button>
                    </div>
                );
            }

            return (
                <div className="mypage__error">
                    <p>{t.common.error}</p>
                    <p className="mypage__errorMessage">({error.message})</p>
                    <button className="mypage__retryBtn" onClick={() => window.location.reload()}>
                        {t.common.retryBtn}
                    </button>
                </div>
            );
        }

        switch (activeMenu) {
            case "profile":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">
                            {isEditing ? t.profile.editTitle : t.profile.title}
                        </h2>
                        {profile && !isEditing && (
                            <div className="mypage__profileCard">
                                <img
                                    src={profile.profileImage || "/default-avatar.png"}
                                    alt="프로필"
                                    className="mypage__avatar"
                                />
                                <div className="mypage__profileInfo">
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">{t.profile.nickname}</span>
                                        <span className="mypage__value">{profile.nickname || "-"}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">{t.profile.email}</span>
                                        <span className="mypage__value">{profile.email}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">{t.profile.bio}</span>
                                        <span className="mypage__value">{profile.bio || "-"}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">{t.profile.joinedAt}</span>
                                        <span className="mypage__value">
                                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                                        </span>
                                    </div>
                                </div>
                                <button className="mypage__editBtn" onClick={startEditing}>
                                    {t.profile.editBtn}
                                </button>
                            </div>
                        )}

                        {/* 수정 모드 */}
                        {profile && isEditing && (
                            <div className="mypage__profileCard">
                                <img
                                    src={profile.profileImage || "/default-avatar.png"}
                                    alt="프로필"
                                    className="mypage__avatar"
                                />

                                <div className="mypage__editForm">
                                    <div className="mypage__formRow">
                                        <label className="mypage__formLabel">{t.profile.nickname}</label>
                                        <input
                                            type="text"
                                            className="mypage__formInput"
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                            placeholder="닉네임을 입력하세요"
                                        />
                                    </div>
                                    <div className="mypage__formRow">
                                        <label className="mypage__formLabel">{t.profile.bio}</label>
                                        <textarea
                                            className="mypage__formTextarea"
                                            value={editBio}
                                            onChange={(e) => setEditBio(e.target.value)}
                                            placeholder="자기소개를 입력하세요"
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                <div className="mypage__editActions">
                                    <button
                                        className="mypage__cancelBtn"
                                        onClick={cancelEditing}
                                        disabled={saving}
                                    >
                                        {t.profile.cancelBtn}
                                    </button>
                                    <button
                                        className="mypage__saveBtn"
                                        onClick={saveProfile}
                                        disabled={saving}
                                    >
                                        {saving ? t.profile.saving : t.profile.saveBtn}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "membership":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">{t.membership.title}</h2>
                        {profile && (
                            <div className="mypage__membershipCard">
                                <div className="mypage__planBadge">{profile.membershipPlan}</div>
                                <p className="mypage__planDesc">
                                    {t.membership.desc.replace("{plan}", profile.membershipPlan)}
                                </p>
                                {profile.membershipPlan === "FREE" && (
                                    <button
                                        className="mypage__upgradeBtn"
                                        onClick={() => setShowUpgrade(true)}
                                    >
                                        {t.membership.upgradeBtn}
                                    </button>
                                )}
                                {profile.membershipPlan !== "FREE" && (
                                    <p className="mypage__proPlan">{t.membership.proUser}</p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "jobs":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">{t.jobs.title}</h2>
                        {data?.jobs.recent && data.jobs.recent.length > 0 ? (
                            <div className="mypage__jobs">
                                {data.jobs.recent.map((job) => (
                                    <div
                                        key={job.id}
                                        className="mypage__job"
                                        onClick={() => {
                                            if (job.status === "DONE" && job.modelKey) {
                                                setSelectedJob(job);
                                            } else if (job.status === "FAILED") {
                                                alert(t.jobs.modalError + job.errorMessage);
                                            } else {
                                                alert(t.jobs.modalPending);
                                            }
                                        }}
                                    >
                                        <div className="mypage__jobThumbData">
                                            <img
                                                src={job.sourceImageUrl || "/placeholder.png"}
                                                alt={job.title}
                                                className="mypage__jobThumb"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/placeholder.png";
                                                }}
                                            />
                                            {(job.status === "FAILED" || job.status === "CANCELED" || job.status === "QUEUED") && (
                                                <div className="mypage__jobOverlay">
                                                    <button
                                                        className="mypage__retryBtn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRetry(job.id);
                                                        }}
                                                        disabled={retrying === job.id}
                                                    >
                                                        {retrying === job.id ? "..." : "↺"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mypage__jobInfo">
                                            <div className="mypage__jobTitle">{job.title || "제목 없음"}</div>
                                            <div className="mypage__jobMeta">
                                                <span className={`mypage__jobStatus ${getStatusClass(job.status)}`}>
                                                    {getStatusLabel(job.status)}
                                                </span>
                                                <span className="mypage__jobDate">
                                                    {formatDate(job.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mypage__empty">{t.jobs.empty}</p>
                        )}
                    </div>
                );

            case "settings":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">{t.settings.title}</h2>
                        <div className="mypage__settingsCard">
                            <div className="mypage__settingRow">
                                <span>{t.settings.notification}</span>
                                <button className="mypage__settingBtn">{t.settings.changeBtn}</button>
                            </div>
                            <div className="mypage__settingRow">
                                <span>{t.settings.language}</span>
                                <div className="mypage__langGroup">
                                    <button
                                        className={`mypage__langBtn ${language === "ko" ? "active" : ""}`}
                                        onClick={() => setLanguage("ko")}
                                    >
                                        한국어
                                    </button>
                                    <button
                                        className={`mypage__langBtn ${language === "en" ? "active" : ""}`}
                                        onClick={() => setLanguage("en")}
                                    >
                                        English
                                    </button>
                                    <button
                                        className={`mypage__langBtn ${language === "ja" ? "active" : ""}`}
                                        onClick={() => setLanguage("ja")}
                                    >
                                        日本語
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "delete":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">{t.delete.title}</h2>
                        <div className="mypage__deleteCard">
                            <p>{t.delete.desc}</p>
                            <button className="mypage__deleteBtn">{t.delete.btn}</button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`mypage lang-${language}`}>
            <Background3D entryDirection="float" />

            <div className="mypage__container">
                <div className="mypage__layout">
                    {/* 나가기 버튼 */}
                    <button className="mypage__exitBtn" onClick={() => navigate("/")}>
                        ✕
                    </button>

                    {/* 왼쪽 사이드바 */}
                    <div className="mypage__sidebar">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={`mypage__menuItem ${activeMenu === item.id ? "active" : ""}`}
                                onClick={() => setActiveMenu(item.id)}
                            >
                                <span className="mypage__menuLabel">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 오른쪽 컨텐츠 */}
                    <div className="mypage__content">
                        {renderContent()}
                    </div>
                </div>
            </div>

            <FloatingMenuButton />
            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

            {/* 3D 뷰어 모달 */}
            {selectedJob && (
                <div className="mypage__modalOverlay">
                    <div className="mypage__modalContent">
                        <button
                            className="mypage__closeBtn"
                            onClick={() => setSelectedJob(null)}
                        >
                            ✕
                        </button>
                        <div className="mypage__viewerContainer">
                            {selectedJob.modelKey ? (
                                <KidsLdrPreview
                                    url={selectedJob.modelKey}
                                    stepMode={true}
                                />
                            ) : (
                                <p>{t.jobs.modalNoData}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
