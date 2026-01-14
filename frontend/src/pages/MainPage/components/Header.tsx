import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="header">
      <img
        className="header__logo"
        src={logo}
        alt="logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      />
    </header>
  );
}
