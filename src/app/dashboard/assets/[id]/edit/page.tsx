import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "../../asset-form";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [asset, categories, conditions, fundSources, locations] =
    await Promise.all([
      prisma.asset.findUnique({
        where: { id },
        include: { photos: true },
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.condition.findMany({ orderBy: { severityLevel: "asc" } }),
      prisma.fundSource.findMany({ orderBy: { name: "asc" } }),
      prisma.location.findMany({ orderBy: { name: "asc" } }),
    ]);

  if (!asset) notFound();

  const defaultValues = {
    id: asset.id,
    name: asset.name,
    categoryId: asset.categoryId,
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    serialNumber: asset.serialNumber ?? "",
    yearAcquired: asset.yearAcquired ?? ("" as const),
    yearPurchased: asset.yearPurchased ?? ("" as const),
    fundSourceId: asset.fundSourceId ?? "",
    vendor: asset.vendor ?? "",
    userName: asset.userName ?? "",
    userPosition: asset.userPosition ?? "",
    locationId: asset.locationId ?? "",
    conditionId: asset.conditionId,
    description: asset.description ?? "",
    itemCode: asset.itemCode ?? "",
    nup: asset.nup ?? "",
    acquisitionValue: asset.acquisitionValue ? Number(asset.acquisitionValue) : ("" as const),
    depreciation: asset.depreciation ? Number(asset.depreciation) : ("" as const),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Aset</h1>
        <p className="text-sm text-muted-foreground">
          {asset.assetCode} — {asset.name}
        </p>
      </div>
      <AssetForm
        categories={JSON.parse(JSON.stringify(categories))}
        conditions={JSON.parse(JSON.stringify(conditions))}
        fundSources={JSON.parse(JSON.stringify(fundSources))}
        locations={JSON.parse(JSON.stringify(locations))}
        defaultValues={defaultValues}
        existingPhotos={JSON.parse(JSON.stringify(asset.photos))}
      />
    </div>
  );
}
