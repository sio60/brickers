"use client";

import { useEffect, useState } from "react";
import styles from "./UpgradeModal.module.css";
import { baseGooglePayRequest, merchantInfo } from "../config/googlePay";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

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
    const [isProcessing, setIsProcessing] = useState(false);

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

        if (isProcessing) return;
        setIsProcessing(true);

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

                try {
                    const res = await authFetch('/api/payments/verify-google-pay', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            paymentData: paymentData,
                            planId: "PRO_MONTHLY"
                        })
                    });

                    if (res.ok) {
                        alert(t.upgradeModal.alertSuccess);
                        onClose();
                        window.location.reload();
                    } else {
                        alert(t.upgradeModal.alertFail);
                    }
                } catch (err) {
                    console.error("Upgrade API Error", err);
                    alert(t.upgradeModal.alertFail);
                } finally {
                    setIsProcessing(false);
                }
            })
            .catch((err: any) => {
                console.error("Payment Error", err);
                setIsProcessing(false);
            });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.upgradeModalOverlay} onClick={onClose}>
            <div className={styles.upgradeModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.upgradeModal__title}>{t.upgradeModal.title}</h2>

                <p className={styles.upgradeModal__message}>
                    {t.upgradeModal.message}
                </p>

                <div className={styles.upgradeModal__plans}>
                    {/* Kids */}
                    <div className={styles.upgradeModal__planCard}>
                        <div className={styles.upgradeModal__planHeader}>
                            <p className={styles.upgradeModal__planTitle}>{t.upgradeModal.kidsPlan.title}</p>
                            <span className={styles.upgradeModal__badge}>{t.upgradeModal.kidsPlan.badge}</span>
                        </div>

                        <ul className={styles.upgradeModal__list}>
                            {t.upgradeModal.kidsPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className={styles.upgradeModal__listItem}>
                                    <span className={styles.upgradeModal__dot} />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className={styles.upgradeModal__planCard}>
                        <div className={styles.upgradeModal__planHeader}>
                            <p className={styles.upgradeModal__planTitle}>{t.upgradeModal.proPlan.title}</p>
                            <span className={styles.upgradeModal__badge}>{t.upgradeModal.proPlan.badge}</span>
                        </div>

                        <ul className={styles.upgradeModal__list}>
                            {t.upgradeModal.proPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className={styles.upgradeModal__listItem}>
                                    <span className={styles.upgradeModal__dot} />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <button
                    className={styles.upgradeModal__button}
                    onClick={onPaymentClick}
                    disabled={isProcessing}
                >
                    {isProcessing ? "Processing..." : t.upgradeModal.payBtn}
                </button>

                <div className={styles.upgradeModal__hint}>{t.upgradeModal.hint}</div>
            </div>
        </div>
    );
}
