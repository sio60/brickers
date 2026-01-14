import "./ModeSplit.css";
import ModeTile from "./ModeTile";
import bg from "../../../../assets/bg.png";
import charImg from "../../../../assets/char.png";
import { useNavigate } from "react-router-dom";

export default function ModeSplit() {
  const navigate = useNavigate();

  return (
    <section className="modeSplit">
      <ModeTile
        variant="adult"
        title="어덜트 모드"
        subtitle="정밀 · 검증 · 고급 설정"
        bgImage={bg}
        onClick={() => navigate("/adult")}
      />

      <ModeTile
        variant="kids"
        title="키즈 모드"
        subtitle="쉬운 조립 · 큰 버튼 · 가이드 중심"
        bgImage={bg}
        onClick={() => navigate("/kids")}
      />

      <img className="modeSplit__char" src={charImg} alt="character" />
    </section>
  );
}
