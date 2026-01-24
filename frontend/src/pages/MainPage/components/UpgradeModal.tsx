import { useEffect, useState } from "react";
import "./UpgradeModal.css";
import { baseGooglePayRequest, merchantInfo } from "../../../config/googlePay";
import { useAuth } from "../../Auth/AuthContext";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

declare global {
    interface Window {
        google: any;
    }
}

export default function UpgradeModal({ isOpen, onClose }: Props) {
    const { authFetch } = useAuth();
    const [paymentsClient, setPaymentsClient] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) return;

        const initializeGooglePay = () => {
            if (window.google && window.google.payments) {
                const client = new window.google.payments.api.PaymentsClient({
                    environment: "TEST",
                    merchantInfo,
                });
                setPaymentsClient(client);
            } else {
                setTimeout(initializeGooglePay, 500);
            }
        };

        initializeGooglePay();
    }, [isOpen]);

    const onPaymentClick = () => {
        if (!paymentsClient) {
            console.error("Google Pay client not ready");
            return;
        }

        const paymentDataRequest = {
            ...baseGooglePayRequest,
            transactionInfo: {
                countryCode: "US",
                currencyCode: "USD",
                totalPriceStatus: "FINAL",
                totalPrice: "10.00",
            },
        };

        paymentsClient
            .loadPaymentData(paymentDataRequest)
            .then(async (paymentData: any) => {
                console.log("Payment Success", paymentData);

                // ✅ 백엔드에 멤버십 업그레이드 요청
                try {
                    const res = await authFetch('/api/my/membership/upgrade', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (res.ok) {
                        localStorage.setItem("isPro", "true");
                        window.dispatchEvent(new Event("storage"));
                        alert("프로 멤버십으로 업그레이드되었습니다!");
                        onClose();
                        window.location.reload(); // 새로고침하여 상태 반영
                    } else {
                        alert("멤버십 업그레이드에 실패했습니다.");
                    }
                } catch (err) {
                    console.error("Upgrade API Error", err);
                    alert("멤버십 업그레이드에 실패했습니다.");
                }
            })
            .catch((err: any) => {
                console.error("Payment Error", err);
            });
    };

    if (!isOpen) return null;

    return (
        <div className="upgradeModalOverlay" onClick={onClose}>
            <div className="upgradeModal" onClick={(e) => e.stopPropagation()}>
                <h2 className="upgradeModal__title">UPGRADE</h2>

                <p className="upgradeModal__message">
                    업그레이드하고 더 많은 도면과 고급 기능을 사용해보세요.
                </p>

                <div className="upgradeModal__plans">
                    {/* Kids */}
                    <div className="upgradeModal__planCard">
                        <div className="upgradeModal__planHeader">
                            <p className="upgradeModal__planTitle">키즈 모드</p>
                            <span className="upgradeModal__badge">Easy</span>
                        </div>

                        <ul className="upgradeModal__list">
                            <li className="upgradeModal__listItem">
                                <span className="upgradeModal__dot" />
                                사진/이미지를 직접 업로드
                            </li>
                            <li className="upgradeModal__listItem">
                                <span className="upgradeModal__dot" />
                                자동 도면 생성
                            </li>
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className="upgradeModal__planCard">
                        <div className="upgradeModal__planHeader">
                            <p className="upgradeModal__planTitle">프로 모드</p>
                            <span className="upgradeModal__badge">Pro</span>
                        </div>

                        <ul className="upgradeModal__list">
                            <li className="upgradeModal__listItem">
                                <span className="upgradeModal__dot" />
                                추천 도면 TOP 3 미리보기
                            </li>
                            <li className="upgradeModal__listItem">
                                <span className="upgradeModal__dot" />
                                최대 3회 재생성(리롤) 가능
                            </li>
                        </ul>
                    </div>
                </div>

                <button className="upgradeModal__button" onClick={onPaymentClick}>
                    Google Pay로 결제하기
                </button>

                <div className="upgradeModal__hint">테스트 결제 환경(TEST) 기준</div>
            </div>
        </div>
    );
}
