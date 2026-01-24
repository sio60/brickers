import { Outlet } from "react-router-dom";
import Header from "./pages/MainPage/components/Header";
import "./Layout.css";
import { useLanguage } from "./contexts/LanguageContext";

export default function Layout() {
  const { language } = useLanguage();

  return (
    <div className="appLayout">
      <Header />
      <main className="appLayout__content">
        <Outlet />
      </main>
    </div>
  );
}
