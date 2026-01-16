import { Outlet } from "react-router-dom";
import Header from "./pages/MainPage/components/Header";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="appLayout">
      <Header />
      <main className="appLayout__content">
        <Outlet />
      </main>
    </div>
  );
}
