import { prisma } from "@/lib/prisma";
import { FundSourcesClient } from "./fund-sources-client";

export default async function FundSourcesPage() {
  const fundSources = await prisma.fundSource.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assets: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sumber Dana</h2>
        <p className="text-muted-foreground">
          Kelola data sumber dana pengadaan aset
        </p>
      </div>
      <FundSourcesClient fundSources={fundSources} />
    </div>
  );
}
