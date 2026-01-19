import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./KidsAgeSelection.css";
import Background3D from "../MainPage/components/Background3D";

import img35 from "../../assets/35.png";
import img67 from "../../assets/67.png";
import img810 from "../../assets/810.png";
import thumb3_5 from "../../assets/3-5.png";
import thumb3_5_2 from "../../assets/3-5_2.png";

// ✅ 방금 만든 모달 컴포넌트
import KidsModelSelectModal from "./components/KidsModelSelectModal";

type AgeGroup = "4-5" | "6-7" | "8-10" | null;

export default function KidsAgeSelection() {
  const navigate = useNavigate();
  const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);

  // ✅ 4-5 선택 시 모달 오픈
  const [openModelModal, setOpenModelModal] = useState(false);

  // ✅ public/ldraw/models 에 넣어둔 파일들 (with thumbnails)
  const models45 = [
    { title: "모델 1", url: "/ldraw/models/3-5_1.ldr", thumbnail: thumb3_5 },
    { title: "모델 2", url: "/ldraw/models/3-5_2.ldr", thumbnail: thumb3_5_2 },
  ];

  const handleSelect = (ageGroup: AgeGroup) => {
    setSelectedAge(ageGroup);

    // ✅ 4-5는 바로 모달 띄워서 모델 고르게 함
    if (ageGroup === "4-5") {
      setOpenModelModal(true);
    }
  };

  // ✅ 4-5에서 모델 선택 또는 이미지 업로드 완료하면 KidsPage로 이동
  const handlePickModel = (url: string | null, file: File | null) => {
    setOpenModelModal(false);
    const modelParam = url ? `&model=${encodeURIComponent(url)}` : "";
    navigate(`/kids/main?age=4-5${modelParam}`, {
      state: file ? { uploadedFile: file } : undefined
    });
  };

  // ✅ Continue 버튼: 4-5는 모달에서 모델 고르는 흐름이라 여기선 막아둠
  const handleContinue = () => {
    if (!selectedAge) return;

    if (selectedAge === "4-5") {
      setOpenModelModal(true);
      return;
    }

    navigate(`/kids/main?age=${selectedAge}`);
  };

  return (
    <div className="kidsAgeSelection">
      <Background3D entryDirection="float" />
      <h1 className="kidsAgeSelection__title">Select Your Child's Age Group</h1>

      <div className="kidsAgeSelection__buttons">
        <button
          className={`kidsAgeBtn ${selectedAge === "4-5" ? "active" : ""}`}
          onClick={() => handleSelect("4-5")}
          type="button"
        >
          <img src={img35} alt="4-5 years" className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label">4-5</div>
        </button>

        <button
          className={`kidsAgeBtn ${selectedAge === "6-7" ? "active" : ""}`}
          onClick={() => handleSelect("6-7")}
          type="button"
        >
          <img src={img67} alt="6-7 years" className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label">6-7</div>
        </button>

        <button
          className={`kidsAgeBtn ${selectedAge === "8-10" ? "active" : ""}`}
          onClick={() => handleSelect("8-10")}
          type="button"
        >
          <img src={img810} alt="8-10 years" className="kidsAgeBtn__img" />
          <div className="kidsAgeBtn__label">8-10</div>
        </button>
      </div>

      <button
        className={`kidsAgeSelection__continue ${selectedAge ? "visible" : ""}`}
        onClick={handleContinue}
        disabled={!selectedAge}
        type="button"
      >
        Continue
      </button>

      {/* ✅ 4-5 전용: 3개 나란히 미리보기 모달 */}
      <KidsModelSelectModal
        open={openModelModal}
        onClose={() => setOpenModelModal(false)}
        onSelect={handlePickModel}
        items={models45}
      />
    </div>
  );
}
