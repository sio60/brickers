import dynamic from "next/dynamic";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";

const Background3D = dynamic(() => import("@/components/three/Background3D"), { ssr: false });

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminRouteGuard>
            <Background3D entryDirection="float" />
            {children}
        </AdminRouteGuard>
    );
}
