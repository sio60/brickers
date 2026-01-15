import { useEffect, useState } from "react";
import "./UpgradeModal.css";
import { baseGooglePayRequest, merchantInfo } from "../../../config/googlePay";

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
            .then((paymentData: any) => {
                console.log("Payment Success", paymentData);
                onClose();
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
