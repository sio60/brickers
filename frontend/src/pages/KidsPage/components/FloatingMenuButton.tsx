import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FloatingMenuButton.css";
import mypageIcon from "../../../assets/mypage.png";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function FloatingMenuButton() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { id: "mypage", label: t.floatingMenu?.mypage || "My Page" },
        { id: "chatbot", label: t.floatingMenu?.chatbot || "ChatBot" },
        { id: "gallery", label: t.floatingMenu?.gallery || "Gallery" },
    ];

    const handleMenuClick = (id: string) => {
        setIsOpen(false);

        switch (id) {
            case "mypage":
                navigate("/mypage");
                break;
            case "chatbot":
                // TODO: 챗봇 연결
                window.open("https://pf.kakao.com/_your_channel", "_blank");
                break;
            case "gallery":
                // TODO: 갤러리 페이지로 이동
                navigate("/gallery");
                break;
        }
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
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={t.floatingMenu.open}
                >
                    <img src={mypageIcon} alt={t.floatingMenu.iconAlt} className="floatingMenu__btnIcon" />
                </button>
            </div>
        </>
    );
}

