"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, SlidersHorizontal, X, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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

  function clearAllFilters() {
    router.push("/dashboard/assets");
  }

  const hasActiveFilters = !!(
    filters.categoryId ||
    filters.conditionId ||
    filters.locationId ||
    filters.fundSourceId ||
    filters.year ||
    filters.search
  );

  const activeFilterCount = [
    filters.categoryId,
    filters.conditionId,
    filters.locationId,
    filters.fundSourceId,
    filters.year,
    filters.search,
  ].filter(Boolean).length;

  // Resolve display names manually to avoid Radix UI SSR hydration issues
  const categoryName = filters.categoryId
    ? (categories.find((c) => c.id === filters.categoryId)?.name ?? "Semua")
    : "Semua";
  const conditionName = filters.conditionId
    ? (conditions.find((c) => c.id === filters.conditionId)?.name ?? "Semua")
    : "Semua";
  const locationName = filters.locationId
    ? (locations.find((l) => l.id === filters.locationId)?.name ?? "Semua")
    : "Semua";
  const fundSourceName = filters.fundSourceId
    ? (fundSources.find((f) => f.id === filters.fundSourceId)?.name ?? "Semua")
    : "Semua";
  const yearName = filters.year ?? "Semua";

  const columns = getColumns(isAdmin, (id, name) =>
    setDeleteTarget({ id, name })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search & Filter Panel */}
      <div className="space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama, kode, serial number, pengguna..."
            defaultValue={filters.search}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                updateFilter("search", (e.target as HTMLInputElement).value);
            }}
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">

          {/* Filter Label */}
          <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-border/40">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter</span>
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* Kategori */}
          <Select
            value={filters.categoryId ?? "all"}
            onValueChange={(v) => updateFilter("categoryId", v ?? "")}
          >
            <SelectTrigger className="h-8 w-auto min-w-[110px] gap-1 border-0 bg-transparent shadow-none text-sm px-1 hover:bg-muted/50 focus:ring-0">
              <span className="shrink-0 text-xs text-muted-foreground">Kategori:</span>
              <span className="font-medium truncate">{categoryName}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-border/60 select-none">|</span>

          {/* Kondisi */}
          <Select
            value={filters.conditionId ?? "all"}
            onValueChange={(v) => updateFilter("conditionId", v ?? "")}
          >
            <SelectTrigger className="h-8 w-auto min-w-[100px] gap-1 border-0 bg-transparent shadow-none text-sm px-1 hover:bg-muted/50 focus:ring-0">
              <span className="shrink-0 text-xs text-muted-foreground">Kondisi:</span>
              <span className="font-medium truncate">{conditionName}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {conditions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-border/60 select-none">|</span>

          {/* Lokasi */}
          <Select
            value={filters.locationId ?? "all"}
            onValueChange={(v) => updateFilter("locationId", v ?? "")}
          >
            <SelectTrigger className="h-8 w-auto min-w-[100px] gap-1 border-0 bg-transparent shadow-none text-sm px-1 hover:bg-muted/50 focus:ring-0">
              <span className="shrink-0 text-xs text-muted-foreground">Lokasi:</span>
              <span className="font-medium truncate max-w-[120px]">{locationName}</span>
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-max max-w-sm">
              <SelectItem value="all">Semua</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id} className="whitespace-normal break-words">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-border/60 select-none">|</span>

          {/* Sumber Dana */}
          <Select
            value={filters.fundSourceId ?? "all"}
            onValueChange={(v) => updateFilter("fundSourceId", v ?? "")}
          >
            <SelectTrigger className="h-8 w-auto min-w-[120px] gap-1 border-0 bg-transparent shadow-none text-sm px-1 hover:bg-muted/50 focus:ring-0">
              <span className="shrink-0 text-xs text-muted-foreground">Sumber Dana:</span>
              <span className="font-medium truncate">{fundSourceName}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {fundSources.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-border/60 select-none">|</span>

          {/* Tahun Pembelian */}
          <Select
            value={filters.year ?? "all"}
            onValueChange={(v) => updateFilter("year", v ?? "")}
          >
            <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1 border-0 bg-transparent shadow-none text-sm px-1 hover:bg-muted/50 focus:ring-0">
              <span className="shrink-0 text-xs text-muted-foreground">Thn. Pembelian:</span>
              <span className="font-medium">{yearName}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
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
