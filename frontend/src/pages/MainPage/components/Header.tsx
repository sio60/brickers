import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import UpgradeModal from "./UpgradeModal";
import { useAuth } from "../../../pages/Auth/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

import AuthLogout from "../../../pages/Auth/AuthLogout";

const LANGUAGE_OPTIONS = [
  { code: "ko" as const, labelKey: "langKo", flag: "🇰🇷" },
  { code: "en" as const, labelKey: "langEn", flag: "🇺🇸" },
  { code: "ja" as const, labelKey: "langJa", flag: "🇯🇵" },
];

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // 업그레이드 여부 확인
  const [isPro, setIsPro] = useState(false);

  // 언어 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          {/* ✅ 언어 선택 드롭다운 */}
          <div className="header__lang" ref={langRef}>
            <button
              className="header__lang-btn"
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-label="Select language"
            >
              {LANGUAGE_OPTIONS.find((l) => l.code === language)?.flag || "🌐"}
            </button>
            {isLangOpen && (
              <div className="header__lang-dropdown">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    className={`header__lang-option ${language === opt.code ? "active" : ""}`}
                    onClick={() => {
                      setLanguage(opt.code);
                      setIsLangOpen(false);
                    }}
                  >
                    <span className="header__lang-flag">{opt.flag}</span>
                    <span className="header__lang-label">{t.settings[opt.labelKey as keyof typeof t.settings]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
