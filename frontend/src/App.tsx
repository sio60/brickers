import { Routes, Route, Navigate } from "react-router-dom";
// import MainPage from "./pages/MainPage/MainPage";
import KidsPage from "./pages/KidsPage/KidsPage";
import AdultPage from "./pages/AdultPage/AdultPage";
import KidsAgeSelection from "./pages/KidsPage/KidsAgeSelection";
import Layout from "./Layout";
import AuthSuccess from "./pages/Auth/AuthSuccess";
import AuthFailure from "./pages/Auth/AuthFailure";
import KidsStepPage from "./pages/KidsPage/KidsStepPage";
import MyPage from "./pages/MyPage/MyPage";


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<KidsAgeSelection />} />
        {/* <Route path="/main-old" element={<MainPage />} /> */}
        <Route path="/kids/main" element={<KidsPage />} />
        <Route path="/kids/steps" element={<KidsStepPage />} />
        <Route path="/adult" element={<AdultPage />} />
        <Route path="/mypage" element={<MyPage />} />

        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/auth/failure" element={<AuthFailure />} />
      </Route>


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
