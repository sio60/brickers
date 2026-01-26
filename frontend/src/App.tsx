import { Routes, Route, Navigate } from "react-router-dom";

import KidsPage from "./pages/KidsPage/KidsPage";

import KidsAgeSelection from "./pages/KidsPage/KidsAgeSelection";
import Layout from "./Layout";
import AuthSuccess from "./pages/Auth/AuthSuccess";
import AuthFailure from "./pages/Auth/AuthFailure";
import KidsStepPage from "./pages/KidsPage/KidsStepPage";
import MyPage from "./pages/MyPage/MyPage";
import Gallery from "./pages/KidsPage/components/Gallery";
import AdminPage from "./pages/AdminPage/AdminPage";


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<KidsAgeSelection />} />

        <Route path="/kids/main" element={<KidsPage />} />
        <Route path="/kids/steps" element={<KidsStepPage />} />

        <Route path="/mypage" element={<MyPage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/auth/failure" element={<AuthFailure />} />
      </Route>


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
