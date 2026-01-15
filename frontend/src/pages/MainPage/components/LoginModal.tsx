import "./LoginModal.css";
import kakaoIcon from "../../../assets/kakao.png";
import googleIcon from "../../../assets/google.png";

// 백엔드 OAuth2 로그인 URL
const BACKEND_KAKAO_LOGIN = "http://localhost:8080/auth/kakao";
const BACKEND_GOOGLE_LOGIN = "http://localhost:8080/auth/google";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
    if (!isOpen) return null;

    const handleKakaoLogin = () => {
        // 백엔드 OAuth2 카카오 로그인으로 이동
        window.location.href = BACKEND_KAKAO_LOGIN;
    };

    const handleGoogleLogin = () => {
        // 백엔드 OAuth2 구글 로그인으로 이동
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
                    <span>Kakao로 시작하기</span>
                </button>

                <button
                    className="loginModal__button loginModal__button--google"
                    onClick={handleGoogleLogin}
                >
                    <img src={googleIcon} alt="Google" className="loginModal__icon" />
                    <span>Google로 시작하기</span>
                </button>
            </div>
        </div>
    );
}
