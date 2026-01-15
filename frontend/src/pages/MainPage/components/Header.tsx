import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import { getKakaoAuthorizeUrl } from "../../../config/kakao";

export default function Header() {
  const navigate = useNavigate();

  const onLogin = () => {
    window.location.href = getKakaoAuthorizeUrl();
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
      <button className="header__login-btn" onClick={onLogin}>
        LOGIN
      </button>
    </header>
  );
}
