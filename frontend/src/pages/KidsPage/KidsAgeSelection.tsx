import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./KidsAgeSelection.css";
import SEO from "../../components/SEO";
import Background3D from "../MainPage/components/Background3D";

import img35 from "../../assets/35.png";
import img67 from "../../assets/67.png";
import img810 from "../../assets/810.png";

// 4-5 썸네일
import thumb3_5 from "../../assets/3-5.png";
import thumb3_5_2 from "../../assets/3-5_2.png";

// 6-7 썸네일
import thumb6_7 from "../../assets/6-7.png";
import thumb6_7_2 from "../../assets/6-7_2.png";

// 8-10 썸네일
import thumb8_10 from "../../assets/8-10.png";
import thumb8_10_2 from "../../assets/8-10_2.png";

import KidsModelSelectModal from "./components/KidsModelSelectModal";
import FloatingMenuButton from "./components/FloatingMenuButton";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../Auth/AuthContext";
import LoginModal from "../MainPage/components/LoginModal";

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

export default function KidsAgeSelection() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth(); // ✅ 로그인 상태 가져오기

  const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // 모달 오픈 상태
  const [openModelModal, setOpenModelModal] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false); // ✅ 로그인 모달 상태

  // ✅ URL에 ?login=true가 있으면 자동으로 로그인 모달 열기 (갤러리에서 로그인 클릭 시)
  useEffect(() => {
    if (searchParams.get("login") === "true" && !isAuthenticated) {
      setOpenLoginModal(true);
      // URL에서 login 파라미터 제거 (뒤로가기 시 모달 다시 안뜨도록)
      searchParams.delete("login");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isAuthenticated]);

  // 현재 모달에 표시할 연령대
  const [modalAge, setModalAge] = useState<"4-5" | "6-7" | "8-10" | null>(null);

  // 4-5 모델들
  const models45 = [
    { title: t.kids.model1, url: "/ldraw/models/3-5_1.ldr", thumbnail: thumb3_5 },
    { title: t.kids.model2, url: "/ldraw/models/3-5_2.ldr", thumbnail: thumb3_5_2 },
  ];

  // 6-7 모델들
  const models67 = [
    { title: t.kids.model1, url: "/ldraw/models/6-7_1.ldr", thumbnail: thumb6_7 },
    { title: t.kids.model2, url: "/ldraw/models/6-7_2.ldr", thumbnail: thumb6_7_2 },
  ];

  // 8-10 모델들
  const models810 = [
    { title: t.kids.model1, url: "/ldraw/models/8-10_1.ldr", thumbnail: thumb8_10 },
    { title: t.kids.model2, url: "/ldraw/models/8-10_2.ldr", thumbnail: thumb8_10_2 },
  ];

  const handleSelect = (ageGroup: AgeGroup) => {
    // ✅ 로그인 체크: 로그인이 안 되어 있으면 진행 막고 로그인 모달 띄움
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setOpenLoginModal(true);
      return;
    }

    setSelectedAge(ageGroup);

    // 모든 연령대에서 모달 띄워서 모델 고르게 함
    if (ageGroup) {
      setModalAge(ageGroup);
      setOpenModelModal(true);
    }
  };

  // 모델 선택 또는 이미지 업로드 완료하면 KidsPage로 이동
  const handlePickModel = (url: string | null, file: File | null) => {
    setOpenModelModal(false);
    const age = modalAge || "4-5";
    const modelParam = url ? `&model=${encodeURIComponent(url)}` : "";
    navigate(`/kids/main?age=${age}${modelParam}`, {
      state: file ? { uploadedFile: file } : undefined
    });
  };

  // Continue 버튼
  const handleContinue = () => {
    if (!isAuthenticated) {
      alert(t.common?.loginRequired || "Login required.");
      setOpenLoginModal(true);
      return;
    }

    if (!selectedAge) return;
    setModalAge(selectedAge);
    setOpenModelModal(true);
  };

  // 현재 모달에 표시할 모델 목록
  const getCurrentModels = () => {
    if (modalAge === "6-7") return models67;
    if (modalAge === "8-10") return models810;
    return models45;
  };

  return (
    <div className="kidsAgeSelection">
      <SEO
        title={t.kids.title || "Choose Your Level"}
        description="Select your age level to start building wonderful AI LEGO creations."
        keywords="lego, ai, bricks, kids, creation, level selection"
      />
      <Background3D entryDirection="top" />
      <h1 className="kidsAgeSelection__title">{t.kids.title}</h1>

      <div className="kidsAgeSelection__buttons">
        <button
          className={`kidsAgeBtn ${selectedAge === "4-5" ? "active" : ""}`}
          onClick={() => handleSelect("4-5")}
          type="button"
        >
          <img src={img35} alt={t.kids.ageAlt?.level1 || "Level 1"} className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "1")}</div>
        </button>

        <button
          className={`kidsAgeBtn ${selectedAge === "6-7" ? "active" : ""}`}
          onClick={() => handleSelect("6-7")}
          type="button"
        >
          <img src={img67} alt={t.kids.ageAlt?.level2 || "Level 2"} className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "2")}</div>
        </button>

        <button
          className={`kidsAgeBtn ${selectedAge === "8-10" ? "active" : ""}`}
          onClick={() => handleSelect("8-10")}
          type="button"
        >
          <img src={img810} alt={t.kids.ageAlt?.level3 || "Level 3"} className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label font-en">{t.kids.level.replace("{lv}", "3")}</div>
        </button>
      </div>

      <button
        className={`kidsAgeSelection__continue ${selectedAge ? "visible" : ""}`}
        onClick={handleContinue}
        disabled={!selectedAge}
        type="button"
      >
        {t.kids.continueBtn}
      </button>

      {/* 모델 선택 모달 */}
      <KidsModelSelectModal
        open={openModelModal}
        onClose={() => setOpenModelModal(false)}
        onSelect={handlePickModel}
        items={getCurrentModels()}
      />

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={openLoginModal}
        onClose={() => setOpenLoginModal(false)}
      />

      {/* 플로팅 메뉴 버튼 */}
      <FloatingMenuButton />
    </div>
  );
}
