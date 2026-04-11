import { prisma } from "@/lib/prisma";
import { ConditionsClient } from "./conditions-client";

export default async function ConditionsPage() {
  const conditions = await prisma.condition.findMany({
    orderBy: { severityLevel: "asc" },
    include: {
      _count: { select: { assets: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Kondisi</h2>
        <p className="text-muted-foreground">
          Kelola data kondisi aset berdasarkan tingkat keparahan
        </p>
      </div>
      <ConditionsClient conditions={conditions} />
    </div>
  );
}
