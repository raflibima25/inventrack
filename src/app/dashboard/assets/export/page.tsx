import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ExportClient } from "./export-client";

export default async function ExportPage() {
  await requireAdmin();

  const [categories, conditions, yearRows] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.condition.findMany({ select: { id: true, name: true }, orderBy: { severityLevel: "asc" } }),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT year_purchased AS year
      FROM assets
      WHERE deleted_at IS NULL AND year_purchased IS NOT NULL
      ORDER BY year DESC
    `,
  ]);

  return (
    <ExportClient
      categories={JSON.parse(JSON.stringify(categories))}
      conditions={JSON.parse(JSON.stringify(conditions))}
      years={yearRows.map((r) => r.year)}
    />
  );
}
