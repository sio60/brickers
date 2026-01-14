import kidBg from "../../assets/kid_bg.png";
import "./KidsPage.css";

export default function KidsPage() {
  return (
    <div
      className="kidsPage"
      style={{
        backgroundImage: `url(${kidBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <h1>키즈 모드</h1>
      <p>여기에 키즈 모드 UI 넣기</p>
    </div>
  );
}
