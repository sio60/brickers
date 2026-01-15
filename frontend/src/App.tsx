import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./pages/MainPage/MainPage";
import KidsPage from "./pages/KidsPage/KidsPage";
import AdultPage from "./pages/AdultPage/AdultPage";
import Layout from "./Layout";
import KakaoCallback from "./pages/Auth/KakaoCallback";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/kids" element={<KidsPage />} />
        <Route path="/adult" element={<AdultPage />} />

        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
