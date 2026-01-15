import { useNavigate } from "react-router-dom";
import "./KidsAgeSelection.css";
// import kidBg from "../../assets/kid_bg.png"; // Reuse background
import Background3D from "../MainPage/components/Background3D";

export default function KidsAgeSelection() {
    const navigate = useNavigate();

    const handleSelect = (ageGroup: string) => {
        navigate(`/kids/main?age=${ageGroup}`);
    };

    return (
        <div className="kidsAgeSelection">
            <Background3D entryDirection="float" />
            <h1 className="kidsAgeSelection__title">WHO IS PLAYING?</h1>

            <div className="kidsAgeSelection__buttons">
                {/* 3~5세 */}
                <button
                    className="kidsAgeBtn kidsAgeBtn--blue"
                    onClick={() => handleSelect("3-5")}
                >
                    <div className="kidsAgeBtn__label">3~5세</div>
                </button>

                {/* 6~7세 */}
                <button
                    className="kidsAgeBtn kidsAgeBtn--red"
                    onClick={() => handleSelect("6-7")}
                >
                    <div className="kidsAgeBtn__label">6~7세</div>
                </button>

                {/* 8~10세 */}
                <button
                    className="kidsAgeBtn kidsAgeBtn--green"
                    onClick={() => handleSelect("8-10")}
                >
                    <div className="kidsAgeBtn__label">8~10세</div>
                </button>
            </div>
        </div>
    );
}
