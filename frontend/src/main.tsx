import React from "react";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./pages/Auth/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";
import { JobProvider } from "./contexts/JobContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ToastProvider>
          <JobProvider>
            <AuthProvider>
              <HelmetProvider>
                <App />
              </HelmetProvider>
            </AuthProvider>
          </JobProvider>
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
