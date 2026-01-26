import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../Auth/AuthContext";
import "./MyPage.css";
import { getMyOverview, getMyProfile, retryJob, updateMyProfile, ApiError } from "../../api/myApi";
import type { MyOverview, MyProfile, MyJob } from "../../api/myApi";
import Background3D from "../MainPage/components/Background3D";
import FloatingMenuButton from "../KidsPage/components/FloatingMenuButton";
import UpgradeModal from "../MainPage/components/UpgradeModal";
import KidsLdrPreview from "../KidsPage/components/KidsLdrPreview";

type MenuItem = "profile" | "membership" | "jobs" | "gallery" | "inquiries" | "settings" | "delete";

export default function MyPage() {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<{ message: string; status: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    // 문의 내역 상태
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);

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
        { id: "gallery" as MenuItem, label: t.menu.gallery },
        { id: "inquiries" as MenuItem, label: t.menu.inquiries },
        { id: "settings" as MenuItem, label: t.menu.settings },
        { id: "delete" as MenuItem, label: t.menu.delete },
    ];

    // 실시간 업데이트 (Polling) 및 문의 내역 로드
    useEffect(() => {
        let intervalId: any;

        if (activeMenu === "jobs") {
            const fetchJobs = async () => {
                try {
                    const updated = await getMyOverview();
                    setData(updated);
                } catch (e) {
                    console.error("Polling failed", e);
                }
            };
            intervalId = setInterval(fetchJobs, 3000);
        }

        if (activeMenu === "inquiries") {
            fetchMyInquiries();
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeMenu]);

    const fetchMyInquiries = async () => {
        try {
            setInquiriesLoading(true);
            const res = await authFetch("/api/inquiries/my?page=0&size=20");
            if (res.ok) {
                const data = await res.json();
                setInquiries(data.content || []);
            }
        } catch (e) {
            console.error("Failed to fetch inquiries", e);
        } finally {
            setInquiriesLoading(false);
        }
    };


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
                            <div className="mypage__profileDashboard">
                                <div className="mypage__profileHeader">
                                    <div className="mypage__avatarWrapper">
                                        <img
                                            src={profile.profileImage || "/default-avatar.png"}
                                            alt="프로필"
                                            className="mypage__avatar"
                                        />
                                    </div>
                                    <div className="mypage__headerInfo">
                                        <div className="mypage__nameGroup">
                                            <h3 className="mypage__nickname">{profile.nickname || "User"}</h3>
                                            <span className="mypage__roleBadge">{profile.membershipPlan}</span>
                                        </div>
                                        <p className="mypage__email">{profile.email}</p>
                                        <p className="mypage__bio">{profile.bio || "자기소개를 입력해주세요!"}</p>
                                        <button className="mypage__editBtnSimple" onClick={startEditing}>
                                            {t.profile.editBtn}
                                        </button>
                                    </div>
                                </div>

                                <div className="mypage__statsGrid">
                                    <div className="mypage__statCard">
                                        <span className="stat__label">내 작업</span>
                                        <span className="stat__value">{data?.jobs.totalCount || 0}</span>
                                    </div>
                                    <div className="mypage__statCard">
                                        <span className="stat__label">내 갤러리</span>
                                        <span className="stat__value">{data?.gallery.totalCount || 0}</span>
                                    </div>
                                    <div className="mypage__statCard">
                                        <span className="stat__label">가입일</span>
                                        <span className="stat__value">
                                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 수정 모드 */}
                        {profile && isEditing && (
                            <div className="mypage__profileEditSection">
                                <div className="mypage__avatarWrapper edit-mode">
                                    <img
                                        src={profile.profileImage || "/default-avatar.png"}
                                        alt="프로필"
                                        className="mypage__avatar"
                                    />
                                </div>

                                <div className="mypage__editContent">
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
                                    <div className="mypage__subInfo">
                                        <div className="mypage__infoRow">
                                            <span className="mypage__label">결제일</span>
                                            <span className="mypage__value">
                                                {/* 임시 로직: 가입일을 결제일로 가정하거나 오늘 날짜 */}
                                                {new Date().toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="mypage__infoRow">
                                            <span className="mypage__label">다음 결제일</span>
                                            <span className="mypage__value">
                                                {/* 임시 로직: 1달 후 */}
                                                {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
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

            case "inquiries":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">{t.menu.inquiries}</h2>
                        <div className="mypage__inquiriesList">
                            {inquiriesLoading ? (
                                <p className="mypage__loading">불러오는 중...</p>
                            ) : inquiries.length > 0 ? (
                                inquiries.map((iq) => (
                                    <div key={iq.id} className="mypage__inquiryCard">
                                        <div className="inquiry__header">
                                            <span className={`inquiry__status ${iq.status}`}>{iq.status}</span>
                                            <span className="inquiry__date">{new Date(iq.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="inquiry__title">{iq.title}</h3>
                                        <p className="inquiry__content">{iq.content}</p>

                                        {iq.answer && (
                                            <div className="inquiry__answer">
                                                <div className="answer__badge">관리자 답변</div>
                                                <p className="answer__text">{iq.answer.content}</p>
                                                <span className="answer__date">{new Date(iq.answer.answeredAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="mypage__empty">문의 내역이 없습니다.</p>
                            )}
                        </div>
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
