import { requireAdmin } from "@/lib/auth-guard";
import { getAppSettings } from "@/actions/settings";
import { ScannerClient } from "./scanner-client";

export default async function ScanPage() {
  await requireAdmin();
  const settings = await getAppSettings();
  return <ScannerClient appName={settings.appName} />;
}
