import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assets: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Kategori</h2>
        <p className="text-muted-foreground">
          Kelola kategori aset untuk klasifikasi barang inventaris
        </p>
      </div>
      <CategoriesClient categories={categories} />
    </div>
  );
}
