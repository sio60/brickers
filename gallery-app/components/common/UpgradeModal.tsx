"use client";

import { useEffect, useState } from "react";
import styles from "./UpgradeModal.module.css";
import { baseGooglePayRequest, merchantInfo } from "../../config/googlePay";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

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
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[3000] backdrop-blur-[4px]"
            onClick={onClose}
        >
            <div
                className={`bg-white p-10 rounded-3xl w-full max-w-[520px] flex flex-col items-center text-center shadow-[0_10px_25px_rgba(0,0,0,0.2)] relative ${styles.modalPop}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="absolute top-4 right-4 w-11 h-11 border-none bg-transparent cursor-pointer text-2xl font-bold flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] text-black z-[100] hover:rotate-90 hover:scale-110"
                    onClick={onClose}
                    aria-label="close"
                >
                    ✕
                </button>
                <h2 className="font-['Bebas_Neue',sans-serif] text-5xl text-black m-0 mb-3 tracking-[2px]">
                    {t.upgradeModal.title}
                </h2>

                <p className="text-lg text-[#555] mb-[22px] leading-[1.55] break-keep">
                    {t.upgradeModal.message}
                </p>

                <div className="w-full grid grid-cols-1 gap-[14px] mb-[22px] text-left">
                    {/* Kids */}
                    <div className="border border-black/12 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-[10px]">
                            <p className="text-base font-[800] text-black m-0">{t.upgradeModal.kidsPlan.title}</p>
                            <span className="text-xs font-[800] px-[10px] py-1.5 rounded-full bg-black/6 text-[#111]">
                                {t.upgradeModal.kidsPlan.badge}
                            </span>
                        </div>

                        <ul className="list-none p-0 m-0 grid gap-1.5">
                            {t.upgradeModal.kidsPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className="flex gap-2 items-start text-sm text-[#444] leading-[1.45]">
                                    <span className="w-2 h-2 mt-1.5 rounded-full bg-black shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className="border border-black/12 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-[10px]">
                            <p className="text-base font-[800] text-black m-0">{t.upgradeModal.proPlan.title}</p>
                            <span className="text-xs font-[800] px-[10px] py-1.5 rounded-full bg-black/6 text-[#111]">
                                {t.upgradeModal.proPlan.badge}
                            </span>
                        </div>

                        <ul className="list-none p-0 m-0 grid gap-1.5">
                            {t.upgradeModal.proPlan.features.map((feature: string, idx: number) => (
                                <li key={idx} className="flex gap-2 items-start text-sm text-[#444] leading-[1.45]">
                                    <span className="w-2 h-2 mt-1.5 rounded-full bg-black shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <button
                    className="w-full h-14 rounded-xl border-none text-lg font-bold flex items-center justify-center cursor-pointer transition-[transform,box-shadow,background-color] duration-100 bg-black text-white hover:bg-[#333] active:scale-[0.98] disabled:bg-[#666] disabled:cursor-not-allowed"
                    onClick={onPaymentClick}
                    disabled={isProcessing}
                >
                    {isProcessing ? "Processing..." : t.upgradeModal.payBtn}
                </button>

                <div className="mt-[10px] text-xs text-[#777]">{t.upgradeModal.hint}</div>
            </div>
        </div>
    );
}
