import AdminRouteGuard from "@/components/admin/AdminRouteGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminRouteGuard>{children}</AdminRouteGuard>;
}
