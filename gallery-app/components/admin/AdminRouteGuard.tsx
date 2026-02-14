"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
    children: React.ReactNode;
};

type GuardState = "checking" | "allowed" | "denied";

export default function AdminRouteGuard({ children }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading, isAuthenticated, authFetch } = useAuth();
    const [guardState, setGuardState] = useState<GuardState>("checking");

    useEffect(() => {
        let cancelled = false;

        const redirectToLogin = () => {
            const nextPath = pathname || "/admin";
            if (typeof window !== "undefined") {
                sessionStorage.setItem("lastPage", nextPath);
            }
            router.replace("/?login=true");
        };

        const verifyAdminAccess = async () => {
            if (isLoading) {
                setGuardState("checking");
                return;
            }

            if (!isAuthenticated) {
                setGuardState("denied");
                redirectToLogin();
                return;
            }

            setGuardState("checking");

            try {
                const res = await authFetch("/api/my/profile");

                if (!res.ok) {
                    if (cancelled) return;

                    setGuardState("denied");

                    if (res.status === 401) {
                        redirectToLogin();
                    } else {
                        router.replace("/");
                    }
                    return;
                }

                const profile = await res.json();

                if (cancelled) return;

                if (profile?.role === "ADMIN") {
                    setGuardState("allowed");
                    return;
                }

                setGuardState("denied");
                router.replace("/");
            } catch (error) {
                console.error("[AdminRouteGuard] failed to verify admin access", error);
                if (cancelled) return;
                setGuardState("denied");
                router.replace("/");
            }
        };

        verifyAdminAccess();

        return () => {
            cancelled = true;
        };
    }, [authFetch, isAuthenticated, isLoading, pathname, router]);

    if (guardState !== "allowed") return null;

    return <>{children}</>;
}
