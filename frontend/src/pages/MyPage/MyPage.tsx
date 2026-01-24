import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyPage.css";
import { getMyOverview, getMyProfile, retryJob, updateMyProfile } from "../../api/myApi";
import type { MyOverview, MyProfile, MyJob } from "../../api/myApi";
import Background3D from "../MainPage/components/Background3D";
import FloatingMenuButton from "../KidsPage/components/FloatingMenuButton";
import UpgradeModal from "../MainPage/components/UpgradeModal";

type MenuItem = "profile" | "membership" | "jobs" | "settings" | "delete";

export default function MyPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<MenuItem>("profile");
    const [retrying, setRetrying] = useState<string | null>(null);

    // 프로필 수정 관련 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [editBio, setEditBio] = useState("");
    const [saving, setSaving] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

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
                setError(err.message);
                setLoading(false);
            });
    }, []);

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
            alert("프로필이 수정되었습니다.");
        } catch {
            alert("프로필 수정에 실패했습니다.");
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
            alert("작업 재시도에 실패했습니다.");
        } finally {
            setRetrying(null);
        }
    };

    const getStatusLabel = (status: MyJob["status"]) => {
        switch (status) {
            case "PENDING": return "대기중";
            case "RUNNING": return "생성중";
            case "PAUSED": return "중단됨";
            case "COMPLETED": return "완료";
            case "FAILED": return "실패";
            default: return status;
        }
    };

    const getStatusClass = (status: MyJob["status"]) => {
        switch (status) {
            case "PENDING": return "pending";
            case "RUNNING": return "running";
            case "PAUSED": return "paused";
            case "COMPLETED": return "completed";
            case "FAILED": return "failed";
            default: return "";
        }
    };

    const menuItems = [
        { id: "profile" as MenuItem, label: "프로필 조회" },
        { id: "membership" as MenuItem, label: "멤버십 정보" },
        { id: "jobs" as MenuItem, label: "내 작업 목록" },
        { id: "settings" as MenuItem, label: "설정" },
        { id: "delete" as MenuItem, label: "회원탈퇴" },
    ];

    const renderContent = () => {
        if (loading) {
            return <div className="mypage__loading">로딩 중...</div>;
        }

        if (error) {
            return (
                <div className="mypage__error">
                    <p>로그인이 필요합니다.</p>
                    <button className="mypage__loginBtn" onClick={() => navigate("/")}>
                        홈으로
                    </button>
                </div>
            );
        }

        switch (activeMenu) {
            case "profile":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">
                            {isEditing ? "프로필 수정" : "프로필 조회"}
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
                                        <span className="mypage__label">닉네임</span>
                                        <span className="mypage__value">{profile.nickname || "-"}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">이메일</span>
                                        <span className="mypage__value">{profile.email}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">자기소개</span>
                                        <span className="mypage__value">{profile.bio || "-"}</span>
                                    </div>
                                    <div className="mypage__infoRow">
                                        <span className="mypage__label">가입일</span>
                                        <span className="mypage__value">
                                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                                        </span>
                                    </div>
                                </div>
                                <button className="mypage__editBtn" onClick={startEditing}>
                                    프로필 수정
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
                                        <label className="mypage__formLabel">닉네임</label>
                                        <input
                                            type="text"
                                            className="mypage__formInput"
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                            placeholder="닉네임을 입력하세요"
                                        />
                                    </div>
                                    <div className="mypage__formRow">
                                        <label className="mypage__formLabel">자기소개</label>
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
                                        취소
                                    </button>
                                    <button
                                        className="mypage__saveBtn"
                                        onClick={saveProfile}
                                        disabled={saving}
                                    >
                                        {saving ? "저장 중..." : "저장"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "membership":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">멤버십 정보</h2>
                        {profile && (
                            <div className="mypage__membershipCard">
                                <div className="mypage__planBadge">{profile.membershipPlan}</div>
                                <p className="mypage__planDesc">
                                    현재 <strong>{profile.membershipPlan}</strong> 플랜을 이용 중입니다.
                                </p>
                                {profile.membershipPlan === "FREE" && (
                                    <button
                                        className="mypage__upgradeBtn"
                                        onClick={() => setShowUpgrade(true)}
                                    >
                                        프로 업그레이드
                                    </button>
                                )}
                                {profile.membershipPlan !== "FREE" && (
                                    <p className="mypage__proPlan">프로 플랜을 이용 중입니다!</p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "jobs":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">내 작업 목록</h2>
                        {data?.jobs.recent && data.jobs.recent.length > 0 ? (
                            <div className="mypage__jobs">
                                {data.jobs.recent.map((job) => (
                                    <div key={job.id} className="mypage__job">
                                        <img
                                            src={job.previewImageUrl || job.sourceImageUrl || "/placeholder.png"}
                                            alt={job.title}
                                            className="mypage__jobThumb"
                                        />
                                        <div className="mypage__jobInfo">
                                            <div className="mypage__jobTitle">{job.title || "제목 없음"}</div>
                                            <div className={`mypage__jobStatus ${getStatusClass(job.status)}`}>
                                                {getStatusLabel(job.status)} - {job.stage}
                                            </div>
                                        </div>
                                        {(job.status === "PAUSED" || job.status === "FAILED") && (
                                            <button
                                                className="mypage__retryBtn"
                                                onClick={() => handleRetry(job.id)}
                                                disabled={retrying === job.id}
                                            >
                                                {retrying === job.id ? "..." : "이어하기"}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mypage__empty">아직 작업 내역이 없습니다.</p>
                        )}
                    </div>
                );

            case "settings":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">설정</h2>
                        <div className="mypage__settingsCard">
                            <div className="mypage__settingRow">
                                <span>알림 설정</span>
                                <button className="mypage__settingBtn">변경</button>
                            </div>
                            <div className="mypage__settingRow">
                                <span>언어 설정</span>
                                <button className="mypage__settingBtn">변경</button>
                            </div>
                        </div>
                    </div>
                );

            case "delete":
                return (
                    <div className="mypage__section">
                        <h2 className="mypage__sectionTitle">회원탈퇴</h2>
                        <div className="mypage__deleteCard">
                            <p>정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구가 불가능합니다.</p>
                            <button className="mypage__deleteBtn">회원탈퇴</button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="mypage">
            <Background3D entryDirection="float" />

            <div className="mypage__container">
                <div className="mypage__layout">
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
        </div>
    );
}
