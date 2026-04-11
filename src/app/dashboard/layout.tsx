import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MainContent } from "@/components/layout/main-content";
import { SidebarProvider } from "@/context/SidebarContext";
import { getAppSettings } from "@/actions/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    role: string;
  };

  const settings = await getAppSettings();

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 print:block print:h-auto print:overflow-visible print:bg-white">
        <AppSidebar
          user={user}
          appName={settings.appName}
          logoUrl={settings.logoUrl}
          data-print-hide
        />
        <MainContent>
          <AppHeader user={user} data-print-hide />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
        </MainContent>
      </div>
    </SidebarProvider>
  );
}
