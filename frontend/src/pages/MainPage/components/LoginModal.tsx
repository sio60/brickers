
import "./LoginModal.css";
import kakaoIcon from "../../../assets/kakao.png";
import googleIcon from "../../../assets/google.png";
import { getKakaoAuthorizeUrl } from "../../../config/kakao";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: Props) {
    if (!isOpen) return null;

    const handleKakaoLogin = () => {
        window.location.href = getKakaoAuthorizeUrl();
    };

    const handleGoogleLogin = () => {
        // Placeholder for Google Login
        console.log("Google Login Clicked");
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