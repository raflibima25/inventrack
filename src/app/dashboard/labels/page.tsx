import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { LabelsClient } from "./labels-client";
import { getAppSettings } from "@/actions/settings";

export default async function LabelsPage() {
  await requireAdmin();

  const [assets, settings] = await Promise.all([
    prisma.asset.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        assetCode: true,
        name: true,
        qrToken: true,
        yearPurchased: true,
        category: { select: { name: true } },
      },
      orderBy: { assetCode: "asc" },
    }),
    getAppSettings(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <LabelsClient
      assets={JSON.parse(JSON.stringify(assets))}
      institutionName={settings.institutionName}
      appUrl={appUrl}
      logoUrl={settings.logoUrl ?? null}
    />
  );
}

