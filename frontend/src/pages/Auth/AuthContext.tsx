import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Provider = "kakao" | "google";
type OAuthUser = Record<string, any>;

type AuthContextValue = {
  user: OAuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<string | null>;
  login: (provider: Provider) => void;
  logout: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ✅ 배포에서 env 안 박혀있으면 ""(same-origin) / 로컬은 8080 권장
const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

console.debug("[AuthContext] API_BASE is set to:", API_BASE);

// ✅ input이 상대경로("/api/...")로 오면 API_BASE 붙여서 백엔드로 보냄
function toAbsoluteUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) return input;
    if (input.startsWith("/")) return `${API_BASE}${input}`;
  }
  return input;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OAuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ refresh 중복 호출 방지 (동시에 여러 refresh 호출되면 토큰 꼬임 방지)
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  // ✅ refresh: refresh-cookie로 access 재발급 + me 호출로 user 세팅
  const refresh = async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      setIsLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!r.ok) {
          setAccessToken(null);
          setUser(null);
          return null;
        }

        const json = await r.json().catch(() => ({} as any));
        const newAccess = json?.accessToken as string | undefined;

        if (!newAccess) {
          setAccessToken(null);
          setUser(null);
          return null;
        }

        setAccessToken(newAccess);

        // access로 내 정보 조회
        const meRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${newAccess}` },
          credentials: "include",
        });

        if (!meRes.ok) {
          setAccessToken(null);
          setUser(null);
          return null;
        }

        const me = await meRes.json().catch(() => null);
        // 백엔드 응답이 { user: ... } 일 수도, 그냥 user 객체일 수도 있어서 둘 다 처리
        setUser((me as any)?.user ?? me);

        return newAccess;
      } catch (e) {
        console.error("refresh 실패:", e);
        setAccessToken(null);
        setUser(null);
        return null;
      } finally {
        setIsLoading(false);
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  };

  // ✅ OAuth2 로그인 시작 (same)
  const login = (provider: Provider) => {
    const lastPage = window.location.pathname + window.location.search;
    sessionStorage.setItem("lastPage", lastPage);
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  // ✅ 로그아웃 (refresh 무효화 + 쿠키 삭제는 서버가)
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
    } catch (e) {
      console.error("logout 실패:", e);
    } finally {
      setAccessToken(null);
      setUser(null);
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  // ✅ access 자동 부착 + 만료(401)시 refresh 후 1회 재시도
  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = toAbsoluteUrl(input);

    // 기본 헤더 설정 (body가 있으면 JSON 권장)
    const headers = new Headers(init.headers || {});
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const res = await fetch(url, { ...init, headers, credentials: "include" });
    if (res.status !== 401) return res;

    // access 만료 → refresh 시도
    const newAccess = await refresh();
    if (!newAccess) return res; // refresh 실패면 원래 401 그대로 반환

    const retryHeaders = new Headers(init.headers || {});
    if (init.body && !retryHeaders.has("Content-Type")) {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${newAccess}`);

    return fetch(url, { ...init, headers: retryHeaders, credentials: "include" });
  };

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  useEffect(() => {
    // 첫 진입/새로고침 시 access 복구
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user,
      isLoading,
      refresh,
      login,
      logout,
      authFetch,
    }),
    [user, accessToken, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
