import Background from "./components/Background";
import ModeSplit from "./components/ModeSplit/ModeSplit";
import "./MainPage.css";

export default function MainPage() {
  return (
    <Background>
      {/* ✅ 헤더 아래 남은 화면 전체 */}
      <div className="mainScreen">
        <ModeSplit />
      </div>
    </Background>
  );
}
