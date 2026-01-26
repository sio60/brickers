import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import UpgradeModal from "./UpgradeModal";
import { useAuth } from "../../../pages/Auth/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

import AuthLogout from "../../../pages/Auth/AuthLogout";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 업그레이드 여부 확인
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkPro = () => {
      setIsPro(localStorage.getItem("isPro") === "true");
    };
    checkPro();

    window.addEventListener("storage", checkPro);
    return () => window.removeEventListener("storage", checkPro);
  }, []);

  const handleLogoutClick = () => {
    setIsLoggingOut(true);
  };

  const handleLogoutComplete = async () => {
    await logout();
    setIsLoggingOut(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="header">
        <img
          className="header__logo"
          src={logo}
          alt={t.header.logoAlt || "logo"}
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        />

        <div className="header__actions">
          {/* ✅ 로그인하고 && 아직 업그레이드 안했을 때만 UPGRADE 표시 */}
          {!isLoading && isAuthenticated && !isPro && (
            <button
              className="header__upgrade-btn"
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              {t.header.upgrade}
            </button>
          )}

          {/* ✅ 로그인 상태에 따라 LOGIN/LOGOUT */}
          {!isLoading && !isAuthenticated && (
            <button
              className="header__login-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              {t.header.login}
            </button>
          )}

          {!isLoading && isAuthenticated && (
            <button className="header__login-btn" onClick={handleLogoutClick}>
              {t.header.logout}
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

      {isLoggingOut && <AuthLogout onLogoutComplete={handleLogoutComplete} />}
    </>
  );
}
