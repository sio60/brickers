import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import UpgradeModal from "./UpgradeModal";
import { useAuth } from "../../../pages/Auth/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

import AuthLogout from "../../../pages/Auth/AuthLogout";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { t } = useLanguage();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 업그레이드 여부 확인 (AuthContext의 user 정보를 기반으로 판단)
  const isPro = user?.membershipPlan === "PRO";

  // 로그인/로그아웃/성공처리 중에는 헤더 버튼들을 숨김
  const isAuthProcessing = isLoading || isLoggingOut || location.pathname === "/auth/success";

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

        {!isAuthProcessing && (
          <div className="header__actions">
            {/* 갤러리 버튼 (항상 표시: Next.js 갤러리/SPA 갤러리 접근) */}
            <a
              href="/gallery"
              className="header__login-btn"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {t.header.gallery}
            </a>

            {/* ✅ 로그인하고 && 아직 업그레이드 안했을 때만 UPGRADE 표시 */}
            {isAuthenticated && !isPro && (
              <button
                className="header__upgrade-btn"
                onClick={() => setIsUpgradeModalOpen(true)}
              >
                {t.header.upgrade}
              </button>
            )}

            {/* ✅ 로그인 상태에 따라 LOGIN/LOGOUT */}
            {!isAuthenticated && (
              <button
                className="header__login-btn"
                onClick={() => setIsLoginModalOpen(true)}
              >
                {t.header.login}
              </button>
            )}

            {isAuthenticated && (
              <button className="header__login-btn" onClick={handleLogoutClick}>
                {t.header.logout}
              </button>
            )}
          </div>
        )}
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
