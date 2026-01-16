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

// ✅ 배포에서 env 안 박혀있으면 ""로 처리 => same-origin 프록시에서 안전
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
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

    // ✅ 여기서 API_BASE가 localhost면 그대로 localhost로 튐 → 배포 env 반드시 세팅!
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);           // 프론트 상태 초기화
      sessionStorage.clear();  // lastPage 등 제거
      window.location.href = "/"; // 홈으로
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      refresh,
      login,
      logout,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
