import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";

// 백엔드 OAuth2 로그인 URL
const BACKEND_AUTH_URL = "http://localhost:8080/auth/kakao";
const BACKEND_LOGOUT_URL = "http://localhost:8080/logout";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const loggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, [location]); // 페이지 이동 시마다 확인

  // 로그인 핸들러
  const onLogin = () => {
    // 현재 페이지 저장 (로그인 후 돌아오기 위해)
    sessionStorage.setItem("lastPage", location.pathname);
    // 백엔드 OAuth2 로그인으로 이동
    window.location.href = BACKEND_AUTH_URL;
  };

  // 로그아웃 핸들러
  const onLogout = () => {
    sessionStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    // 백엔드 로그아웃 호출
    window.location.href = BACKEND_LOGOUT_URL;
  };

  return (
    <header className="header">
      <img
        className="header__logo"
        src={logo}
        alt="logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      />
      {isLoggedIn ? (
        <button className="header__login-btn" onClick={onLogout}>
          LOGOUT
        </button>
      ) : (
        <button className="header__login-btn" onClick={onLogin}>
          LOGIN
        </button>
      )}
    </header>
  );
}
