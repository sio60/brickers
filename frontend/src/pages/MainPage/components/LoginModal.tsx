import "./LoginModal.css";
import kakaoIcon from "../../../assets/kakao.png";
import googleIcon from "../../../assets/google.png";

// ✅ 백엔드 베이스 URL (권장: .env.local에 VITE_API_BASE_URL 넣기)
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";

// ✅ 백엔드 OAuth2 로그인 URL
const BACKEND_KAKAO_LOGIN = `${API_BASE}/auth/kakao`;
const BACKEND_GOOGLE_LOGIN = `${API_BASE}/auth/google`;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const saveLastPage = () => {
    // ✅ 로그인 버튼 누른 “현재 페이지” 저장 (로그인 성공 후 복귀 용도)
    const lastPage =
      window.location.pathname + window.location.search + window.location.hash;
    sessionStorage.setItem("lastPage", lastPage);
  };

  const handleKakaoLogin = () => {
    saveLastPage();
    window.location.href = BACKEND_KAKAO_LOGIN;
  };

  const handleGoogleLogin = () => {
    saveLastPage();
    window.location.href = BACKEND_GOOGLE_LOGIN;
  };

  return (
    <div className="loginModalOverlay" onClick={onClose}>
      <div className="loginModal" onClick={(e) => e.stopPropagation()}>
        <h2 className="loginModal__title">LOGIN</h2>

        <button
          className="loginModal__button loginModal__button--kakao"
          onClick={handleKakaoLogin}
        >
          <img src={kakaoIcon} alt="Kakao" className="loginModal__icon" />
          <span className="loginModal__paramName">Kakao로 시작하기</span>
        </button>

        <button
          className="loginModal__button loginModal__button--google"
          onClick={handleGoogleLogin}
        >
          <img src={googleIcon} alt="Google" className="loginModal__icon" />
          <span className="loginModal__paramName">Google로 시작하기</span>
        </button>
      </div>
    </div>
  );
}
