import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./pages/MainPage/MainPage";
import KidsPage from "./pages/KidsPage/KidsPage";
import AdultPage from "./pages/AdultPage/AdultPage";
import Layout from "./Layout";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/kids" element={<KidsPage />} />
        <Route path="/adult" element={<AdultPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
