import Background from "./components/Background";
import ModeSplit from "./components/ModeSplit/ModeSplit";
import "./MainPage.css";

export default function MainPage() {
  return (
    <Background>
      <div className="mainScreen">
        <ModeSplit />
      </div>
    </Background>
  );
}
