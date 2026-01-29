import { useEffect, useState } from "react";
import "./UpgradeModal.css";
import { baseGooglePayRequest, merchantInfo } from "../../../config/googlePay";
import { useAuth } from "../../Auth/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

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
    const { t } = useLanguage();
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

                // ✅ 백엔드에 멤버십 업그레이드 요청 (구글 페이 데이터 포함)
                try {
                    const res = await authFetch('/api/my/membership/upgrade', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            paymentData: paymentData
                        })
                    });

                    if (res.ok) {
                        alert(t.upgradeModal.alertSuccess);
                        onClose();
                        window.location.reload(); // 새로고침하여 상태 반영
                    } else {
                        alert(t.upgradeModal.alertFail);
                    }
                } catch (err) {
                    console.error("Upgrade API Error", err);
                    alert(t.upgradeModal.alertFail);
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
                <h2 className="upgradeModal__title">{t.upgradeModal.title}</h2>

                <p className="upgradeModal__message">
                    {t.upgradeModal.message}
                </p>

                <div className="upgradeModal__plans">
                    {/* Kids */}
                    <div className="upgradeModal__planCard">
                        <div className="upgradeModal__planHeader">
                            <p className="upgradeModal__planTitle">{t.upgradeModal.kidsPlan.title}</p>
                            <span className="upgradeModal__badge">{t.upgradeModal.kidsPlan.badge}</span>
                        </div>

                        <ul className="upgradeModal__list">
                            {t.upgradeModal.kidsPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className="upgradeModal__listItem">
                                    <span className="upgradeModal__dot" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className="upgradeModal__planCard">
                        <div className="upgradeModal__planHeader">
                            <p className="upgradeModal__planTitle">{t.upgradeModal.proPlan.title}</p>
                            <span className="upgradeModal__badge">{t.upgradeModal.proPlan.badge}</span>
                        </div>

                        <ul className="upgradeModal__list">
                            {t.upgradeModal.proPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className="upgradeModal__listItem">
                                    <span className="upgradeModal__dot" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <button className="upgradeModal__button" onClick={onPaymentClick}>
                    {t.upgradeModal.payBtn}
                </button>

                <div className="upgradeModal__hint">{t.upgradeModal.hint}</div>
            </div>
        </div>
    );
}
