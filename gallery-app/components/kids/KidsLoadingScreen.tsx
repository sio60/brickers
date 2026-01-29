import { useLanguage } from "../../contexts/LanguageContext";
import "./KidsLoadingScreen.css";

interface KidsLoadingScreenProps {
    percent: number;
}

export default function KidsLoadingScreen({ percent }: KidsLoadingScreenProps) {
    const { t } = useLanguage();

    return (
        <div className="kidsLoadingScreen">
            <div className="kidsLoadingScreen__bar">
                <div
                    className="kidsLoadingScreen__progress"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
            <div className="kidsLoadingScreen__text">
                {t.kids.generate.loading} {percent}%
            </div>
        </div>
    );
}
