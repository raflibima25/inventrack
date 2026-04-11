import { getDashboardStats } from "@/actions/dashboard";
import { getAppSettings } from "@/actions/settings";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [stats, settings] = await Promise.all([
    getDashboardStats(),
    getAppSettings(),
  ]);

  return <DashboardClient stats={stats} appName={settings.appName} />;
}
