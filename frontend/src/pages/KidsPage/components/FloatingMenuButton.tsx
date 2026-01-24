import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FloatingMenuButton.css";
import mypageIcon from "../../../assets/mypage.png";

export default function FloatingMenuButton() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { id: "mypage", label: "마이페이지" },
        { id: "chatbot", label: "브릭봇 문의" },
        { id: "gallery", label: "갤러리" },
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
                    aria-label="메뉴 열기"
                >
                    <img src={mypageIcon} alt="메뉴" className="floatingMenu__btnIcon" />
                </button>
            </div>
        </>
    );
}

