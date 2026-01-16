import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Provider = "kakao" | "google";
type OAuthUser = Record<string, any>;

type AuthContextValue = {
  user: OAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (provider: Provider) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      // ✅ 백엔드 RequestMapping 주소와 정확히 일치시켜야 404가 안 남
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data?.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("인증 갱신 실패:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (provider: Provider) => {
    const lastPage = window.location.pathname + window.location.search;
    sessionStorage.setItem("lastPage", lastPage);
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({
    user, isAuthenticated: !!user, isLoading, refresh, login, logout
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};