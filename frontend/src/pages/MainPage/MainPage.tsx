import Background from "./components/Background";
import Header from "./components/Header";
import ModeSplit from "./components/ModeSplit/ModeSplit"; // ✅ 추가
import "./MainPage.css";

export default function MainPage() {
  return (
    <Background>
      <Header />

      {/* ✅ 헤더 아래 남은 화면 전체 */}
      <div className="mainScreen">
        <ModeSplit />
      </div>
    </Background>
  );
}
