import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import UpgradeModal from "./UpgradeModal";

export default function Header() {
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
          <button className="header__upgrade-btn" onClick={() => setIsUpgradeModalOpen(true)}>
            UPGRADE
          </button>
          <button
            className="header__login-btn"
            onClick={() => setIsLoginModalOpen(true)}
          >
            LOGIN
          </button>
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
