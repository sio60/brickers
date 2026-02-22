import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import AdminBackground from "@/components/admin/AdminBackground";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminRouteGuard>
            {children}
        </AdminRouteGuard>
    );
}
