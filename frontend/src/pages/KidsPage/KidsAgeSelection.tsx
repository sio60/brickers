import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./KidsAgeSelection.css";
import Background3D from "../MainPage/components/Background3D";
import img35 from "../../assets/35.png";
import img67 from "../../assets/67.png";
import img810 from "../../assets/810.png";

type AgeGroup = "3-5" | "6-7" | "8-10" | null;

export default function KidsAgeSelection() {
    const navigate = useNavigate();
    const [selectedAge, setSelectedAge] = useState<AgeGroup>(null);

    const handleSelect = (ageGroup: AgeGroup) => {
        setSelectedAge(ageGroup);
    };

    const handleContinue = () => {
        if (selectedAge) {
            navigate(`/kids/main?age=${selectedAge}`);
        }
    };

    return (
        <div className="kidsAgeSelection">
            <Background3D entryDirection="float" />
            <h1 className="kidsAgeSelection__title">Select Your Child's Age Group</h1>

            <div className="kidsAgeSelection__buttons">
                <button
                    className={`kidsAgeBtn ${selectedAge === "3-5" ? "active" : ""}`}
                    onClick={() => handleSelect("3-5")}
                >
                    <img src={img35} alt="3-5 years" className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label">3-5</div>
                </button>

                <button
                    className={`kidsAgeBtn ${selectedAge === "6-7" ? "active" : ""}`}
                    onClick={() => handleSelect("6-7")}
                >
                    <img src={img67} alt="6-7 years" className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label">6-7</div>
                </button>

                <button
                    className={`kidsAgeBtn ${selectedAge === "8-10" ? "active" : ""}`}
                    onClick={() => handleSelect("8-10")}
                >
                    <img src={img810} alt="8-10 years" className="kidsAgeBtn__img" />
                    <div className="kidsAgeBtn__label">8-10</div>
                </button>
            </div>

            <button
                className={`kidsAgeSelection__continue ${selectedAge ? "visible" : ""}`}
                onClick={handleContinue}
                disabled={!selectedAge}
            >
                Continue
            </button>
        </div>
    );
}
