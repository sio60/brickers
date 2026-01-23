import { useEffect, useState } from "react";
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

  const handleLogout = async () => {
    await logout();
    // 로컬스토리지 isPro 제거 (정책에 따라 다름, 여기선 일단 둠 or 제거)
    // localStorage.removeItem("isPro"); 
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
          {/* ✅ 로그인하고 && 아직 업그레이드 안했을 때만 UPGRADE 표시 */}
          {!isLoading && isAuthenticated && !isPro && (
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
