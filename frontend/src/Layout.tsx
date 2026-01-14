import { Outlet } from "react-router-dom";
import Header from "./pages/MainPage/components/Header";

export default function Layout() {
    return (
        <>
            <Header />
            <Outlet />
        </>
    );
}
