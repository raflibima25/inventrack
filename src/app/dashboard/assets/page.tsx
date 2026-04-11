import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { AssetsClient } from "./assets-client";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const where: Record<string, unknown> = { deletedAt: null };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { assetCode: { contains: params.search, mode: "insensitive" } },
      { serialNumber: { contains: params.search, mode: "insensitive" } },
      { userName: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.conditionId) where.conditionId = params.conditionId;
  if (params.fundSourceId) where.fundSourceId = params.fundSourceId;
  if (params.locationId) where.locationId = params.locationId;
  if (params.year) where.yearPurchased = parseInt(params.year, 10);

  const [assets, categories, conditions, fundSources, locations, yearRows] =
    await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { name: true } },
          condition: { select: { name: true, severityLevel: true } },
          fundSource: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.condition.findMany({ orderBy: { severityLevel: "asc" } }),
      prisma.fundSource.findMany({ orderBy: { name: "asc" } }),
      prisma.location.findMany({ orderBy: { name: "asc" } }),
      prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT year_purchased AS year
        FROM assets
        WHERE deleted_at IS NULL AND year_purchased IS NOT NULL
        ORDER BY year DESC
      `,
    ]);

  const years = yearRows.map((r) => r.year);

  return (
    <AssetsClient
      assets={JSON.parse(JSON.stringify(assets))}
      categories={JSON.parse(JSON.stringify(categories))}
      conditions={JSON.parse(JSON.stringify(conditions))}
      fundSources={JSON.parse(JSON.stringify(fundSources))}
      locations={JSON.parse(JSON.stringify(locations))}
      years={years}
      filters={params}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
