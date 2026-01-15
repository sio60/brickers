import "./ModeSplit.css";
import ModeTile from "./ModeTile";
import kidsModeImg from "../../../../assets/kids_mode.png";
import { useNavigate } from "react-router-dom";
import Background3D from "../Background3D";

export default function ModeSplit() {
  const navigate = useNavigate();

  return (
    <section className="modeSplit">
      <Background3D />

      <div className="modeSplit__controls">
        <ModeTile
          variant="adult"
          title="ADULTS MODE"
          subtitle="정밀 · 검증 · 고급 설정"
          onClick={() => navigate("/adult")}
        />

        <ModeTile
          variant="kids"
          title="키즈 모드"
          logo={kidsModeImg}
          onClick={() => navigate("/kids")}
        />
      </div>
    </section>
  );
}
