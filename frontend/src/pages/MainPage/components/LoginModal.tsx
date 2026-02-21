
import "./LoginModal.css";
import kakaoIcon from "../../../assets/kakao.png";
import googleIcon from "../../../assets/google.png";
import { useLanguage } from "../../../contexts/LanguageContext";

// ✅ 백엔드 OAuth2 로그인 URL (상대 경로 사용 - Nginx가 프록시 처리)
const BACKEND_KAKAO_LOGIN = "/auth/kakao";
const BACKEND_GOOGLE_LOGIN = "/auth/google";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const saveLastPage = () => {
    // ✅ returnUrl 파라미터가 있으면 그걸 사용 (갤러리에서 로그인 시)
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');

    // returnUrl이 있으면 사용, 없으면 현재 페이지 (login 파라미터는 제외)
    let lastPage: string;
    if (returnUrl) {
      lastPage = returnUrl;
    } else {
      // login 파라미터 제거한 현재 URL
      urlParams.delete('login');
      const cleanSearch = urlParams.toString();
      lastPage = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
    }

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
        <h2 className="loginModal__title">{t.auth.title}</h2>

        <button
          className="loginModal__button loginModal__button--kakao"
          onClick={handleKakaoLogin}
        >
          <img src={kakaoIcon} alt="Kakao" className="loginModal__icon" />
          <span className="loginModal__paramName">{t.auth.kakao}</span>
        </button>

        <button
          className="loginModal__button loginModal__button--google"
          onClick={handleGoogleLogin}
        >
          <img src={googleIcon} alt="Google" className="loginModal__icon" />
          <span className="loginModal__paramName">{t.auth.google}</span>
        </button>
      </div>
    </div>
  );
}
