import { prisma } from "@/lib/prisma";
import { LocationsClient } from "./locations-client";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assets: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lokasi</h2>
        <p className="text-muted-foreground">
          Kelola data lokasi penyimpanan aset
        </p>
      </div>
      <LocationsClient locations={locations} />
    </div>
  );
}
