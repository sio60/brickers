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

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (data?.authenticated) {
        setUser(data.user ?? null);
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("user", JSON.stringify(data.user ?? {}));
      } else {
        setUser(null);
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("user");
      }
    } catch (e) {
      // 네트워크/서버 문제면 로그인 상태를 확정할 수 없으니 일단 비로그인 처리
      setUser(null);
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };

  const login = (provider: Provider) => {
    // ✅ "로그인 누른 그 페이지" 저장
    const lastPage = window.location.pathname + window.location.search + window.location.hash;
    sessionStorage.setItem("lastPage", lastPage);

    // ✅ 백엔드 주도 OAuth2 시작 (/auth/kakao, /auth/google)
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  const logout = async () => {
    try {
      // Spring Security logout 기본은 POST
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // 실패해도 프론트 상태는 정리
    } finally {
      setUser(null);
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("user");
    }
  };

  useEffect(() => {
    // 앱 시작 시 로그인 상태 동기화
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
