import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import "./Header.css";
import LoginModal from "./LoginModal";
import { baseGooglePayRequest, merchantInfo } from "../../../config/googlePay";

// Declare google on window
declare global {
  interface Window {
    google: any;
  }
}

export default function Header() {
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState<any>(null);

  useEffect(() => {
    const initializeGooglePay = () => {
      if (window.google && window.google.payments) {
        const client = new window.google.payments.api.PaymentsClient({
          environment: 'TEST',
          merchantInfo
        });
        setPaymentsClient(client);
      } else {
        // Retry if script not loaded yet (basic retry)
        setTimeout(initializeGooglePay, 500);
      }
    };
    initializeGooglePay();
  }, []);

  const onUpgradeClick = () => {
    if (!paymentsClient) {
      console.error("Google Pay client not ready");
      return;
    }

    const paymentDataRequest = {
      ...baseGooglePayRequest,
      transactionInfo: {
        countryCode: 'US',
        currencyCode: 'USD',
        totalPriceStatus: 'FINAL',
        totalPrice: '10.00', // Example price
      }
    };

    paymentsClient.loadPaymentData(paymentDataRequest)
      .then((paymentData: any) => {
        console.log("Payment Success", paymentData);
        // Here you would handle the payment token
      })
      .catch((err: any) => {
        console.error("Payment Error", err);
      });
  };

  return (
    <>
      <header className="header">
        <img
          className="header__logo"
          src={logo}
          alt="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        />
        <div className="header__actions">
          <button className="header__upgrade-btn" onClick={onUpgradeClick}>
            UPGRADE
          </button>
          <button
            className="header__login-btn"
            onClick={() => setIsLoginModalOpen(true)}
          >
            LOGIN
          </button>
        </div>
      </header>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
