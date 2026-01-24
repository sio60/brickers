import "./ModeSplit.css";
import ModeTile from "./ModeTile";
import kidsModeImg from "../../../../assets/kids_mode.png";
import { useNavigate } from "react-router-dom";
import Background3D from "../Background3D";
import { useLanguage } from "../../../../contexts/LanguageContext";

export default function ModeSplit() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="modeSplit">
      <Background3D />

      <div className="modeSplit__controls">
        <ModeTile
          variant="adult"
          title={t.main.proMode}
          subtitle={t.main.proSubtitle}
          onClick={() => navigate("/adult")}
        />

        <ModeTile
          variant="kids"
          title={t.main.kidsMode}
          logo={kidsModeImg}
          onClick={() => navigate("/kids")}
        />
      </div>
    </section>
  );
}
