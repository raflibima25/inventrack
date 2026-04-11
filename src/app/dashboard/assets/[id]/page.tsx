import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/actions/settings";
import { AssetDetail } from "./asset-detail";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      condition: true,
      fundSource: true,
      location: true,
      creator: { select: { name: true } },
      photos: { orderBy: { isPrimary: "desc" } },
      mutations: {
        orderBy: { mutationDate: "desc" },
        include: { creator: { select: { name: true } } },
      },
    },
  });

  if (!asset || asset.deletedAt) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const settings = await getAppSettings();

  return (
    <AssetDetail
      asset={JSON.parse(JSON.stringify(asset))}
      appUrl={appUrl}
      appName={settings.appName}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
