// src/pages/KidsPage/components/KidsLoadingScreen.tsx
import "./KidsLoadingScreen.css";
import BrickStackMiniGame from "./BrickStackMiniGame";

type Props = {
  percent: number;
};

export default function KidsLoadingScreen({ percent }: Props) {
  return (
    <div className="kidsLoading">
      {/* 심플한 프로그레스 바만 표시 */}
      <div className="kidsLoading__progressWrap">
        <span className="kidsLoading__title">Creating...</span>
        <div className="kidsLoading__progressBar">
          <div
            className="kidsLoading__progressFill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 게임 영역 */}
      <div className="kidsLoading__gameWrap">
        <BrickStackMiniGame />
      </div>
    </div>
  );
}
