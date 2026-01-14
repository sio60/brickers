import logo from "../../../assets/logo.png";
import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <img className="header__logo" src={logo} alt="logo" />
    </header>
  );
}
