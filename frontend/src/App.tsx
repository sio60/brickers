import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./pages/MainPage/MainPage";
import KidsPage from "./pages/KidsPage/KidsPage";
import AdultPage from "./pages/AdultPage/AdultPage";
import KidsAgeSelection from "./pages/KidsPage/KidsAgeSelection";
import Layout from "./Layout";
import AuthSuccess from "./pages/Auth/AuthSuccess";
import AuthFailure from "./pages/Auth/AuthFailure";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/kids" element={<KidsAgeSelection />} />
        <Route path="/kids/main" element={<KidsPage />} />
        <Route path="/adult" element={<AdultPage />} />

        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/auth/failure" element={<AuthFailure />} />
      </Route>


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
