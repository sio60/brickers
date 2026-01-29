import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FloatingMenuButton.css";
import mypageIcon from "../../../assets/mypage.png";
import { useLanguage } from "../../../contexts/LanguageContext";
import { getMyProfile } from "../../../api/myApi";
import { useAuth } from "../../Auth/AuthContext";
import LoginModal from "../../MainPage/components/LoginModal";
import BrickBotModal from "./BrickBotModal"; // [NEW]

export default function FloatingMenuButton() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    const [isAdmin, setIsAdmin] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // [NEW] 챗봇 모달 상태
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            getMyProfile().then(profile => {
                if (profile.role === "ADMIN") {
                    setIsAdmin(true);
                }
            }).catch(console.error);
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const menuItems = [
        { id: "mypage", label: t.floatingMenu?.mypage || "My Page" },
        { id: "chatbot", label: t.floatingMenu?.chatbot || "BrickBot" }, // Label Change
    ];

    if (isAdmin) {
        menuItems.push({ id: "admin", label: t.floatingMenu?.admin || "Admin Page" });
    }

    const handleMenuClick = (id: string) => {
        setIsOpen(false);

        switch (id) {
            case "mypage":
                navigate("/mypage");
                break;
            case "chatbot":
                // [NEW] Open Chat Modal
                setIsChatOpen(true);
                break;
            case "gallery":
                // 갤러리는 Next.js 앱으로 이동 (Nginx가 /gallery를 gallery-app으로 프록시)
                window.location.href = "/gallery";
                break;
            case "admin":
                navigate("/admin");
                break;
        }
    };

    const handleMainBtnClick = () => {
        if (!isAuthenticated) {
            alert(t.common?.loginRequired || "Login required.");
            setIsLoginModalOpen(true);
            return;
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* 배경 오버레이 */}
            {isOpen && (
                <div
                    className="floatingMenu__overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className="floatingMenu__container">
                {/* 메뉴 모달 */}
                <div className={`floatingMenu__modal ${isOpen ? "isOpen" : ""}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className="floatingMenu__item"
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <span className="floatingMenu__itemLabel">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* 플로팅 버튼 */}
                <button
                    className={`floatingMenu__btn ${isOpen ? "isOpen" : ""}`}
                    onClick={handleMainBtnClick}
                    aria-label={t.floatingMenu.open}
                >
                    <img src={mypageIcon} alt={t.floatingMenu.iconAlt} className="floatingMenu__btnIcon" />
                </button>
            </div>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            {/* [NEW] BrickBot Modal */}
            <BrickBotModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </>
    );
}

