"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getColumns, type AssetRow } from "./columns";
import { deleteAsset } from "@/actions/assets";

type FilterOption = { id: string; name: string };

type Props = {
  assets: AssetRow[];
  categories: FilterOption[];
  conditions: FilterOption[];
  fundSources: FilterOption[];
  locations: FilterOption[];
  years: number[];
  filters: Record<string, string | undefined>;
  isAdmin: boolean;
};

export function AssetsClient({
  assets,
  categories,
  conditions,
  fundSources,
  locations,
  years,
  filters,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && k !== key) params.set(k, v);
    }
    if (value && value !== "all") params.set(key, value);
    router.push(`/dashboard/assets?${params.toString()}`);
  }

  const columns = getColumns(isAdmin, (id, name) =>
    setDeleteTarget({ id, name })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daftar Aset</h1>
          <p className="text-sm text-muted-foreground">
            Total {assets.length} aset
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href="/dashboard/assets/trash">
              <Button variant="outline">
                <Trash2 className="mr-2 h-4 w-4" />
                Sampah
              </Button>
            </Link>
            <Link href="/dashboard/assets/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Aset
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Cari nama, kode, SN, pengguna..."
          defaultValue={filters.search}
          className="w-64"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              updateFilter("search", (e.target as HTMLInputElement).value);
          }}
        />
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(v) => updateFilter("categoryId", v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.conditionId ?? "all"}
          onValueChange={(v) => updateFilter("conditionId", v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kondisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi</SelectItem>
            {conditions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.locationId ?? "all"}
          onValueChange={(v) => updateFilter("locationId", v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Lokasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Lokasi</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.fundSourceId ?? "all"}
          onValueChange={(v) => updateFilter("fundSourceId", v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sumber Dana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber Dana</SelectItem>
            {fundSources.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.year ?? "all"}
          onValueChange={(v) => updateFilter("year", v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tahun Pembelian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={assets} searchKey="name" />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Aset"
        description={`Aset "${deleteTarget?.name}" akan dipindahkan ke sampah. Anda bisa memulihkannya nanti.`}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteAsset(deleteTarget.id);
          if (result.success) {
            toast.success("Aset berhasil dihapus");
            setDeleteTarget(null);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
}
