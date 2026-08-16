import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current pathname to check if we're on the login page
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Skip auth check for login page - let it render without ANY layout wrapper
  if (pathname === "/admin/login" || pathname.includes("/admin/login")) {
    return <>{children}</>;
  }

  // Skip auth check gracefully - handle JWT decryption errors silently
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error: any) {
    // If JWT decryption fails (corrupted cookie), treat as no session
    // COMPLETELY SILENT - don't log anything, don't throw, just return children
    return <>{children}</>;
  }

  // If no valid session, let middleware handle redirect
  if (!session) {
    return <>{children}</>;
  }

  const isAdmin = session.user.role === "admin" || session.user.role === "editor";

  if (!isAdmin) {
    return <>{children}</>;
  }

  // Only render full admin layout if we have a valid admin session
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col w-full">
        <AdminHeader user={session.user} />
        <main className="flex-1 p-6 w-full">{children}</main>
      </div>
    </div>
  );
}
