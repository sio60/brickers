import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import UpgradeModal from "./UpgradeModal";
import { useAuth } from "../../../pages/Auth/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout } = useAuth();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    // 원하면 홈으로 보내기 (원치 않으면 이 줄 삭제)
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="header">
        <img
          className="header__logo"
          src={logo}
          alt="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        />

        <div className="header__actions">
          {/* ✅ 로그인해야 UPGRADE 보이게 */}
          {!isLoading && isAuthenticated && (
            <button
              className="header__upgrade-btn"
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              UPGRADE
            </button>
          )}

          {/* ✅ 로그인 상태에 따라 LOGIN/LOGOUT */}
          {!isLoading && !isAuthenticated && (
            <button
              className="header__login-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              LOGIN
            </button>
          )}

          {!isLoading && isAuthenticated && (
            <button className="header__login-btn" onClick={handleLogout}>
              LOGOUT
            </button>
          )}
        </div>
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
}
